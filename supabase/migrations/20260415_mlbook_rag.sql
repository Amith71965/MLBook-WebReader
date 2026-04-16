-- Enable pgvector extension for embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Book content chunks with vector embeddings
CREATE TABLE public.book_chunks (
  id bigserial PRIMARY KEY,
  chapter smallint NOT NULL,
  section text NOT NULL,
  chunk_index smallint NOT NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  embedding vector(768),
  created_at timestamptz DEFAULT now(),
  UNIQUE (chapter, section, chunk_index)
);

-- HNSW index for fast cosine similarity search
CREATE INDEX book_chunks_embedding_idx
  ON public.book_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX book_chunks_chapter_idx ON public.book_chunks (chapter);

-- Allow public read access (no auth needed to search book content)
ALTER TABLE public.book_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_chunks_public_read"
  ON public.book_chunks FOR SELECT
  USING (true);

-- Chat sessions for conversation memory
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  messages jsonb NOT NULL DEFAULT '[]',
  current_chapter smallint,
  current_section text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX chat_sessions_token_idx ON public.chat_sessions (session_token);

-- Allow anonymous access to chat sessions via session token
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_sessions_public_access"
  ON public.chat_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to search for similar chunks using cosine similarity
CREATE OR REPLACE FUNCTION match_book_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_chapter smallint DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  chapter smallint,
  section text,
  chunk_index smallint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    bc.id,
    bc.chapter,
    bc.section,
    bc.chunk_index,
    bc.content,
    bc.metadata,
    1 - (bc.embedding <=> query_embedding) AS similarity
  FROM public.book_chunks bc
  WHERE
    bc.embedding IS NOT NULL
    AND 1 - (bc.embedding <=> query_embedding) > match_threshold
    AND (filter_chapter IS NULL OR bc.chapter = filter_chapter)
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
$$;
