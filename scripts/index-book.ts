/**
 * Index book content into Supabase pgvector for RAG search.
 *
 * Usage: npx tsx scripts/index-book.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_AI_API_TOKEN
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load .env.local (Next.js convention) with fallback to .env
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

const MLBOOK_DIR = path.join(process.cwd(), "content", "mlbook");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_AI_API_TOKEN!;

/* ------------------------------------------------------------------ */
/*  Embedding                                                          */
/* ------------------------------------------------------------------ */

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-base-en-v1.5`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: texts }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudflare AI embedding failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return json.result.data;
}

/* ------------------------------------------------------------------ */
/*  Chunking                                                           */
/* ------------------------------------------------------------------ */

type Chunk = {
  chapter: number;
  section: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
};

function chunkText(
  text: string,
  maxTokens = 1200,
  overlap = 200
): string[] {
  // Rough token count: ~4 chars per token
  const maxChars = maxTokens * 4;
  const overlapChars = overlap * 4;

  // Split at paragraph boundaries
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    // Never split inside math blocks
    if (current.length + para.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      // Overlap: keep the last portion of the previous chunk
      const overlapStart = Math.max(0, current.length - overlapChars);
      current = current.slice(overlapStart) + "\n\n" + para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

function stripMdxComponents(text: string): string {
  // Replace <Figure> tags with their caption
  text = text.replace(
    /<Figure[^>]*caption="([^"]*)"[^>]*\/>/g,
    "[Figure: $1]"
  );
  // Strip other JSX components but keep text content
  text = text.replace(/<[A-Z][^>]*>([\s\S]*?)<\/[A-Z][^>]*>/g, "$1");
  text = text.replace(/<[A-Z][^>]*\/>/g, "");
  return text;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("🔍 Reading book metadata...");

  const bookMeta = JSON.parse(
    fs.readFileSync(path.join(MLBOOK_DIR, "_meta.json"), "utf8")
  );

  const allChunks: Chunk[] = [];

  for (const [chId, chMeta] of Object.entries(bookMeta.chapters) as [
    string,
    { number: number; title: string },
  ][]) {
    const chDir = path.join(MLBOOK_DIR, chId);
    if (!fs.existsSync(chDir)) {
      console.log(`  ⚠ Skipping ${chId} (directory not found)`);
      continue;
    }

    // Sections are derived from MDX filenames on disk. The chapter _meta.json
    // `sections` field (written by split-sections.ts) is an array of objects
    // `{order, slug, title, wordCount}` — we use file-system order instead so
    // we stay resilient if _meta.json is out of sync.
    const mdxFiles = fs
      .readdirSync(chDir)
      .filter((f) => /^\d{2}-.+\.mdx$/.test(f))
      .sort();

    for (const mdxFile of mdxFiles) {
      const mdxPath = path.join(chDir, mdxFile);
      const raw = fs.readFileSync(mdxPath, "utf8");
      const { data: fm, content } = matter(raw);

      const cleanContent = stripMdxComponents(content);
      const textChunks = chunkText(cleanContent);

      for (let i = 0; i < textChunks.length; i++) {
        allChunks.push({
          chapter: chMeta.number,
          section: (fm.slug as string) || mdxFile.replace(/\.mdx$/, ""),
          chunkIndex: i,
          content: textChunks[i],
          metadata: {
            chapterTitle: chMeta.title,
            sectionTitle: (fm.title as string) || mdxFile,
            keywords: fm.keywords || [],
            notebooks: fm.notebooks || [],
          },
        });
      }
    }

    console.log(
      `  ✓ Chapter ${chMeta.number}: ${chMeta.title} — ${mdxFiles.length} sections`
    );
  }

  console.log(`\n📦 Total chunks: ${allChunks.length}`);

  // Clear existing chunks
  console.log("🗑️  Clearing existing chunks...");
  await supabase.from("book_chunks").delete().neq("id", 0);

  // Embed and insert in batches of 10
  const batchSize = 10;
  let inserted = 0;

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.content);

    console.log(
      `  Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allChunks.length / batchSize)}...`
    );

    const embeddings = await embed(texts);

    const rows = batch.map((chunk, j) => ({
      chapter: chunk.chapter,
      section: chunk.section,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: JSON.stringify(embeddings[j]),
    }));

    const { error } = await supabase.from("book_chunks").insert(rows);
    if (error) {
      console.error(`  ✗ Insert error:`, error.message);
    } else {
      inserted += batch.length;
    }

    // Rate limit: wait 100ms between batches
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n✅ Indexed ${inserted}/${allChunks.length} chunks successfully`);
}

main().catch(console.error);
