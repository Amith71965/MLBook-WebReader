# Changelog

All notable changes to this project are tracked here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); each entry links to the PR or issue where applicable.

## [Unreleased]

### Fixed
- Chat: handle `res.body` correctly so the streaming response is read exactly once (no more `TypeError: Body is disturbed or locked` when the stream yields no chunks).
- Chat: reset the prefill guard and clear the selection chip when a message is submitted, so consecutive "Ask AI about this" clicks re-prefill the input reliably.
- Text selection: the document-level `mousedown` listener no longer collapses the selection when the click lands on the floating "Ask AI about this" tooltip (previously unmounted the button between mousedown and mouseup, swallowing the click).
- Cover image: uploaded `cover.png` to R2 so the home page cover renders instead of 404'ing.

### Known issues
- Chat fails after ~4–5 turns in the same section because the route concatenates the client's `messages` array with the server-side `sessionHistory`, duplicating every prior turn in the prompt and overflowing Llama 3.1 8B's 8k context window. Tracked separately — fix pending.

---

## [0.1.0] — 2026-04-17

First working end-to-end build.

### Added
- PDF-to-MDX extraction pipeline (Colab notebook + `split-sections.ts`) covering 5 chapters, 96 sections.
- Editorial reader UI: book landing page, chapter overview, section reader with sticky chapter nav, prev/next pager, AI chat shell.
- Text-selection flow: select passage → floating "Ask AI about this" tooltip → chat panel prefills input with the quoted passage.
- RAG backend: Supabase pgvector (HNSW, 768-dim) populated by `scripts/index-book.ts`, Cloudflare Workers AI for both embeddings (`bge-base-en-v1.5`) and generation (`llama-3.1-8b-instruct`).
- Cookie-based anonymous chat sessions stored in `chat_sessions`.
- Static generation for 106 pages (landing + 5 chapter overviews + 96 sections + API route).
- KaTeX math, Shiki code highlighting, custom `<Figure>` MDX component, R2-hosted image assets.
