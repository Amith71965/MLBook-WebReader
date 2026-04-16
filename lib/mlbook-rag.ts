import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for RAG operations.
 * Bypasses RLS so we can read/write book_chunks and chat_sessions.
 */
function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/* ------------------------------------------------------------------ */
/*  Cloudflare Workers AI — Embeddings                                 */
/* ------------------------------------------------------------------ */

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_AI_API_TOKEN!;

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-base-en-v1.5`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: [text] }),
    }
  );

  if (!res.ok) {
    throw new Error(`Cloudflare AI embedding failed: ${res.status}`);
  }

  const json = await res.json();
  return json.result.data[0];
}

/* ------------------------------------------------------------------ */
/*  Vector Search                                                      */
/* ------------------------------------------------------------------ */

export type ChunkMatch = {
  id: number;
  chapter: number;
  section: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export async function searchChunks(
  queryEmbedding: number[],
  options: { chapter?: number; threshold?: number; count?: number } = {}
): Promise<ChunkMatch[]> {
  const { chapter, threshold = 0.5, count = 5 } = options;
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("match_book_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: count,
    filter_chapter: chapter ?? null,
  });

  if (error) {
    console.error("Vector search error:", error);
    return [];
  }

  return (data ?? []) as ChunkMatch[];
}

/* ------------------------------------------------------------------ */
/*  Chat Session Memory                                                */
/* ------------------------------------------------------------------ */

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function getSessionMessages(
  sessionToken: string
): Promise<ChatMessage[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("chat_sessions")
    .select("messages")
    .eq("session_token", sessionToken)
    .single();

  if (!data) return [];
  return (data.messages as ChatMessage[]).slice(-20); // Keep last 10 pairs
}

export async function saveSessionMessages(
  sessionToken: string,
  messages: ChatMessage[],
  context?: { chapter?: number; section?: string }
) {
  const supabase = getSupabase();
  const trimmed = messages.slice(-20); // Keep last 10 pairs

  const { error } = await supabase.from("chat_sessions").upsert(
    {
      session_token: sessionToken,
      messages: trimmed,
      current_chapter: context?.chapter ?? null,
      current_section: context?.section ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_token" }
  );

  if (error) console.error("Save session error:", error);
}
