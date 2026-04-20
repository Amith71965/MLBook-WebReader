# Contributing to ML Book Reader

Thanks for your interest. This doc covers how to get the project running, what to work on, and how to submit a PR.

---

## 1. Get set up

### Fork & clone

```bash
# fork on GitHub first, then:
git clone https://github.com/<your-username>/MLBook-WebReader.git
cd MLBook-WebReader
git remote add upstream https://github.com/Amith71965/MLBook-WebReader.git
npm install
```

### Create your own Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → new project.
2. Once provisioned, open the SQL editor and run the contents of `supabase/migrations/20260415_mlbook_rag.sql`. This enables the `vector` extension and creates `book_chunks` + `chat_sessions`.
3. From **Project Settings → API**, copy the **URL** and the **service_role** key (not the anon key — the indexer writes to the DB).

### Create a Cloudflare Workers AI token (free)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **AI → Workers AI**.
2. From the **Home** page note your **Account ID**.
3. Go to **My Profile → API Tokens → Create Token**. Use the "Workers AI" template (read access is enough for inference; you don't need edit).

### Fill in `.env.local`

```bash
cp .env.example .env.local
```

Populate:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_AI_API_TOKEN=<api-token>
```

### Index the content

```bash
npx tsx scripts/index-book.ts
```

This embeds every MDX chunk via Cloudflare (free tier) and inserts ~280 rows into *your* Supabase. You only need to re-run this after editing `content/mlbook/**`.

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Navigate into any chapter and try the chat panel — if you get streaming responses you're fully set up.

> **About the R2 images:** the project's public R2 bucket (`https://pub-ee43721261544e8e8a0ca430d5d2c560.r2.dev/`) is already baked into the MDX files. You don't need your own bucket. Just use the URLs as-is.

---

## 2. What to work on

- **Issues labelled `good first issue`** — small, scoped, don't require deep context.
- **Open bugs** — see [Issues](https://github.com/Amith71965/MLBook-WebReader/issues).
- **Content polish** — if you spot a rendering glitch in a section (bad LaTeX, weird escaping, missing figure), fix the source MDX under `content/mlbook/ch<N>/`.
- **UX & a11y** — mobile layout, keyboard nav, screen reader support.
- **Bigger features** — open an issue first to discuss before writing code.

If you're not sure whether something's in scope, open an issue or a draft PR and ask.

---

## 3. Workflow

### Branch naming

```
feat/<short-kebab-description>     e.g. feat/reading-progress
fix/<short-kebab-description>      e.g. fix/chat-duplicate-history
docs/<short-kebab-description>     e.g. docs/add-deployment-guide
```

### Make your changes

- Keep changes focused. One PR = one concern.
- Run `npm run build` before pushing — the build is strict and will catch MDX/TypeScript errors.
- If you touch `content/mlbook/**` or the chunker, re-run `npx tsx scripts/index-book.ts` against your own Supabase and verify chat still works.
- If you add a new dependency, justify it in the PR description.

### Commit messages

Prefer [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(chat): cap history to last 6 messages before replay
fix(mdx): escape literal curly braces in prose
docs(readme): document R2 access for contributors
```

One-line summary + short body is plenty. Don't include Claude/assistant attribution.

### Submit the PR

```bash
git push -u origin <your-branch>
gh pr create --base main --fill
```

Or open the PR in the GitHub UI using the "Compare & pull request" banner.

**In the PR description, please include:**

- **What** the change does (one paragraph).
- **Why** it's needed (link the issue, or describe the bug).
- **How** you verified it (steps, screenshots for UI changes, build output for script changes).
- A note in `CHANGELOG.md` under the `## Unreleased` section.

### Review

- Branch protection requires a PR (no direct pushes to `main`).
- Code scanning runs automatically.
- A maintainer will review, request changes if needed, and merge.

---

## 4. Reporting bugs / requesting features

Open a [GitHub issue](https://github.com/Amith71965/MLBook-WebReader/issues/new). Include:

- What you expected
- What actually happened
- Repro steps (URL, section, browser, what you selected / typed)
- Console errors (DevTools → Console) and network responses (DevTools → Network → the failing request)
- Screenshot if UI-related

For RAG / chat issues specifically, please also capture the `/api/chat` request payload and response from the Network tab — that's where most of the interesting failure modes live.

---

## 5. Code style

- **TypeScript everywhere.** No untyped JS in new code.
- **Tailwind for styling.** Match the existing editorial aesthetic (Newsreader serif, Inter small-caps labels, cream/ink palette, tonal sectioning — no card borders).
- **No new dark-mode variants** unless explicitly scoped.
- **Keep the reading experience distraction-free.** UI chrome should fade, content should sing.

---

## 6. Questions

- Open a [Discussion](https://github.com/Amith71965/MLBook-WebReader/discussions) for design/architecture questions.
- Ping in the relevant issue thread for bug clarifications.

Thanks for contributing. 📚
