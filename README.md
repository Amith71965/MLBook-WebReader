# ML Book Reader

An interactive web reader for **"Machine Learning and Artificial Intelligence: Concepts, Algorithms and Models"** by [Prof. Reza Rawassizadeh](https://www.bu.edu/met/profile/reza-rawassizadeh/) (Boston University) — with a RAG-powered AI study assistant.

Five chapters (Ch 3, 8, 9, 10, 11) of the professor's open-source textbook, extracted from PDF into editorial-quality MDX, rendered with KaTeX + Shiki, and paired with a chat panel that retrieves relevant passages via pgvector and streams answers from Llama 3.1 8B.

- **Live:** _(deployment URL TBD)_
- **Textbook source:** [Prof. Rawassizadeh's GitHub repo](https://github.com/Rawassizadeh/Machine-Learning-and-AI-Concepts-Algorithms-and-Models)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Content | MDX + remark-math + rehype-katex + Shiki |
| Styling | Tailwind CSS 4 (Newsreader serif + Inter) |
| Vector store | Supabase pgvector (HNSW, 768-dim) |
| Embeddings | Cloudflare Workers AI — `@cf/baai/bge-base-en-v1.5` |
| LLM | Cloudflare Workers AI — `@cf/meta/llama-3.1-8b-instruct` |
| AI orchestration | Vercel AI SDK (`streamText`) |
| Assets | Cloudflare R2 (public bucket) |
| PDF extraction | [marker-pdf](https://github.com/datalab-to/marker) via Google Colab |

---

## Quick start (local dev)

Prerequisites: **Node 20+**, **npm**, and accounts on **Supabase** (free) + **Cloudflare** (free).

```bash
git clone https://github.com/Amith71965/MLBook-WebReader.git
cd MLBook-WebReader
npm install
cp .env.example .env.local    # fill in values — see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Edit `.env.local`:

```bash
# Supabase — create a free project at https://supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Cloudflare Workers AI — https://dash.cloudflare.com → AI → Workers AI
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_AI_API_TOKEN=<api-token-with-workers-ai-read-permission>
```

### Database migration

In your Supabase SQL editor, run [`supabase/migrations/20260415_mlbook_rag.sql`](supabase/migrations/20260415_mlbook_rag.sql) to create the `book_chunks` and `chat_sessions` tables and enable pgvector.

### Indexing the textbook into pgvector

```bash
npx tsx scripts/index-book.ts
```

Reads all `content/mlbook/**/*.mdx`, chunks the sections, embeds each chunk via Cloudflare, and inserts ~280 rows into `book_chunks`. Takes ~2 min.

### Assets (images, cover, PDFs)

Images are already hosted on the project's public R2 bucket:

```
https://pub-ee43721261544e8e8a0ca430d5d2c560.r2.dev/
```

**You do not need your own R2 bucket to run this locally.** Section MDX files reference these URLs directly; your dev server fetches them anonymously. Egress is free on R2 and the reads fit comfortably in the project's free tier.

If you need to re-extract the PDFs from scratch, see [`colab/README.md`](colab/README.md) and [`scripts/upload-r2.sh`](scripts/upload-r2.sh). Most contributors will never need this.

---

## Project structure

```
app/
  page.tsx                       # book landing / TOC
  [chapter]/page.tsx             # chapter overview
  [chapter]/[section]/page.tsx   # section reader + chat shell
  api/chat/route.ts              # RAG chat endpoint (streaming)
components/mlbook/               # ChatPanel, ChapterNav, TextSelectionAction, …
content/mlbook/                  # MDX: 5 chapters, 96 sections
  _meta.json                     # book-level metadata
  ch<N>/_meta.json               # per-chapter section ordering
  ch<N>/NN-<slug>.mdx            # section content
lib/
  mlbook.ts                      # content loader (chapters/sections)
  mlbook-rag.ts                  # embed + pgvector search + session store
scripts/
  split-sections.ts              # markdown → MDX per-section with sanitizer
  index-book.ts                  # chunk + embed + upload to pgvector
  upload-r2.sh                   # upload images/PDFs/cover to R2
supabase/migrations/             # SQL schema
colab/extract_pdfs.ipynb         # one-off PDF extraction (runs on Colab T4)
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow (fork → branch → PR). Short version:

1. Fork the repo and clone your fork.
2. `git checkout -b feat/<short-description>`
3. Follow the [Quick start](#quick-start-local-dev) to get it running locally.
4. Make your changes, run `npm run build` to verify nothing broke.
5. Open a PR against `main` with a clear description of the problem and the fix.

Known issues and planned improvements are tracked in [GitHub Issues](https://github.com/Amith71965/MLBook-WebReader/issues). The [CHANGELOG](CHANGELOG.md) lists what's shipped.

---

## License & credits

- **Textbook content** © Prof. Reza Rawassizadeh — used with permission for this open-source reader implementation. See the [original repo](https://github.com/Rawassizadeh/Machine-Learning-and-AI-Concepts-Algorithms-and-Models) for the canonical PDFs and companion Jupyter notebooks.
- **Reader code** — MIT.
