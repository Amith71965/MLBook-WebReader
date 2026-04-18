/**
 * split-sections.ts
 *
 * Reads marker-extracted markdown from tmp/extracted/<chapter>/<stem>/<stem>.md
 * and splits each chapter's monolithic markdown into per-section MDX files with
 * frontmatter under content/mlbook/<chapter>/NN-slug.mdx.
 *
 * Also:
 *   - Rewrites image references: `![alt](image_0.png)` → `<Figure src="{R2_BASE}/<chapter>/image_0.png" alt="..." />`
 *   - Emits a `sections` array into each chapter's _meta.json (preserving
 *     existing top-level fields).
 *   - Optionally copies images from the extracted dir into tmp/images/<chapter>/
 *     to stage for R2 upload.
 *
 * Run: npx tsx scripts/split-sections.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const EXTRACT_DIR = path.join(ROOT, "tmp", "extracted");
const CONTENT_DIR = path.join(ROOT, "content", "mlbook");
const STAGE_IMG_DIR = path.join(ROOT, "tmp", "images");

const R2_BASE =
  process.env.MLBOOK_R2_BASE ??
  "https://pub-ee43721261544e8e8a0ca430d5d2c560.r2.dev";

const CHAPTERS = ["ch3", "ch8", "ch9", "ch10", "ch11"] as const;

type Section = {
  order: number;
  slug: string;
  title: string;
  filename: string;
  wordCount: number;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Find the extracted markdown file for a chapter. marker-pdf places it at
 * tmp/extracted/<chapter>/<stem>/<stem>.md where <stem> is the PDF filename
 * without extension.
 */
function findMarkdown(chapter: string): { md: string; dir: string } | null {
  const chDir = path.join(EXTRACT_DIR, chapter);
  if (!fs.existsSync(chDir)) return null;
  for (const sub of fs.readdirSync(chDir)) {
    const subDir = path.join(chDir, sub);
    if (!fs.statSync(subDir).isDirectory()) continue;
    const candidate = path.join(subDir, `${sub}.md`);
    if (fs.existsSync(candidate)) return { md: candidate, dir: subDir };
    // Fallback: any .md file inside
    const any = fs.readdirSync(subDir).find((f) => f.endsWith(".md"));
    if (any) return { md: path.join(subDir, any), dir: subDir };
  }
  return null;
}

/**
 * Normalise a marker-produced heading: strip surrounding bold markers and
 * chapter prefix (e.g. `**Chapter 3: Statistics & Probability**`).
 */
function cleanTitle(raw: string): string {
  let t = raw.trim();
  // Strip leading/trailing bold or italic markers
  t = t.replace(/^\*+/, "").replace(/\*+$/, "");
  t = t.replace(/^_+/, "").replace(/_+$/, "");
  return t.trim();
}

/**
 * A heading is a plausible section boundary if:
 *   - not inside a fenced code block
 *   - starts with a capital letter (filters out Python comments like `# velocity`)
 *   - first non-whitespace is a letter or bold-open (`**`)
 */
function looksLikeRealHeading(line: string): boolean {
  const rest = line.replace(/^#+\s+/, "").trim();
  if (rest.length < 2) return false;
  // Real section titles are short. Python comments that leaked out of code
  // blocks (common in ch9 gradient-boosting section) are full paragraphs.
  if (rest.length > 120) return false;
  // Heuristic: headings shouldn't look like prose / code-comment text.
  if (/\$|[=;]|->|\bthis step\b|\binitializ|\balgorithm initializes\b/i.test(rest)) {
    return false;
  }
  // Python-comment false positives like `# velocity`, `# it uses ...`:
  // require start with uppercase letter or bold marker or opening paren.
  const firstChar = rest.replace(/^\*+/, "")[0] ?? "";
  if (!/[A-Z(]/.test(firstChar)) return false;
  return true;
}

const MIN_SECTION_WORDS = 80;

/**
 * Count real (non-false-positive) headings at each level, outside code fences.
 * Returns {1: count, 2: count} counting from line 2 onward so the chapter
 * title h1 doesn't dominate.
 */
function countHeadings(markdown: string): { h1: number; h2: number } {
  const lines = markdown.split("\n");
  let inCode = false;
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) inCode = !inCode;
    if (inCode) continue;
    if (i === 0) continue; // skip chapter title line
    if (/^## (?!#)/.test(line) && looksLikeRealHeading(line)) h2++;
    else if (/^# (?!#)/.test(line) && looksLikeRealHeading(line)) h1++;
  }
  return { h1, h2 };
}

/**
 * Split at the auto-detected section-heading level (h1 or h2). The very first
 * h1 (chapter title) is always dropped. Deeper headings stay inline.
 * Tiny stubs (< MIN_SECTION_WORDS) are merged back into the prior section.
 */
function splitSections(markdown: string): { title: string; body: string }[] {
  const { h1, h2 } = countHeadings(markdown);
  // Pick whichever level has more real section-boundary headings.
  // If h2 dominates, sections live at h2 (e.g. ch8, ch9, ch11).
  // Otherwise split at h1 (e.g. ch3, ch10).
  const splitLevel: 1 | 2 = h2 > h1 ? 2 : 1;
  const splitRe = splitLevel === 2 ? /^## (?!#)/ : /^# (?!#)/;

  const lines = markdown.split("\n");
  type S = { title: string; body: string[] };
  const sections: S[] = [];
  let current: S | null = null;
  let inCodeFence = false;
  let seenFirstH1 = false;

  const flush = () => {
    if (!current) return;
    if (current.body.join("\n").trim().length > 0) sections.push(current);
    current = null;
  };

  for (const line of lines) {
    if (/^```/.test(line)) inCodeFence = !inCodeFence;

    // Always drop the first h1 (chapter title), regardless of split level.
    const isH1 = !inCodeFence && /^# (?!#)/.test(line);
    if (isH1 && !seenFirstH1 && looksLikeRealHeading(line)) {
      seenFirstH1 = true;
      continue;
    }

    const isBoundary =
      !inCodeFence && splitRe.test(line) && looksLikeRealHeading(line);

    if (isBoundary) {
      flush();
      current = {
        title: cleanTitle(line.replace(/^#+\s+/, "")),
        body: [],
      };
    } else {
      if (!current) {
        // Content before any section heading (preamble / table-of-contents).
        current = { title: "Introduction", body: [] };
      }
      current.body.push(line);
    }
  }
  flush();

  // Merge tiny sections into the previous section — prevents 1-paragraph
  // stubs (e.g. a loose heading followed by one sentence) from becoming
  // their own MDX file.
  const merged: S[] = [];
  for (const s of sections) {
    const wordCount = s.body.join(" ").split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_SECTION_WORDS && merged.length > 0) {
      merged[merged.length - 1].body.push(`\n### ${s.title}\n`, ...s.body);
    } else {
      merged.push(s);
    }
  }

  return merged.map((s) => ({ title: s.title, body: s.body.join("\n") }));
}

/**
 * Sanitize raw markdown bits that confuse the MDX compiler:
 *   - bare `<br>` / `<hr>` → self-closing (MDX requires JSX-valid tags)
 *   - stray `<sup>` / `<sub>` with improper nesting kept as-is for now
 */
function sanitizeMdx(body: string): string {
  let out = body
    .replace(/<br\s*>/gi, "<br/>")
    .replace(/<hr\s*>/gi, "<hr/>")
    // marker-pdf inserts empty <span id="page-..."></span> anchors everywhere.
    .replace(/<span\s+id="[^"]*"\s*><\/span>/gi, "")
    // marker occasionally emits busted footnote markers like
    // `<sup>&</sup>lt;sup>3</sup>` — collapse them to a plain `<sup>3</sup>`.
    .replace(/<sup>&<\/sup>lt;sup>([^<]*)<\/sup>/gi, "<sup>$1</sup>")
    // Stray HTML entities that aren't `&amp;` / `&lt;` / `&gt;` / `&quot;`
    // break MDX's JSX parser because `&` starts an entity reference.
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    // Markdown autolinks `<https://...>` confuse MDX's JSX parser. Convert
    // to explicit markdown links.
    .replace(/<(https?:\/\/[^>\s]+)>/g, "[$1]($1)")
    // Bare `<` not starting a tag (e.g., "p < 0.05", "<0.2" in tables) is a
    // JSX syntax error in MDX. Escape it.
    .replace(/<(?![A-Za-z/!?])/g, "&lt;");

  // MDX parses `{...}` in prose as a JS expression, which breaks on content
  // like `{1,1,2,4}`. Escape literal braces that sit in prose, while leaving
  // them intact inside math ($...$, $$...$$), code (``` / `), and JSX tags.
  const stash: string[] = [];
  const hide = (m: string) => {
    stash.push(m);
    return `\u0000${stash.length - 1}\u0000`;
  };

  out = out
    .replace(/```[\s\S]*?```/g, hide)       // fenced code
    .replace(/`[^`\n]*`/g, hide)            // inline code
    .replace(/\$\$[\s\S]*?\$\$/g, hide)     // display math
    .replace(/\$[^$\n]+?\$/g, hide)         // inline math
    .replace(/<\/?[A-Za-z][^>]*>/g, hide);  // JSX/HTML tags

  out = out.replace(/([{}])/g, "\\$1");

  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i) => stash[Number(i)]);

  return out;
}

/**
 * Rewrite markdown image tags `![alt](filename.png)` to R2-hosted <Figure>.
 * Collects referenced image filenames for staging.
 */
function rewriteImages(
  body: string,
  chapter: string,
  referenced: Set<string>,
): string {
  return body.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, alt: string, src: string, title?: string) => {
      // Skip absolute URLs
      if (/^https?:\/\//i.test(src)) {
        return `<Figure src="${src}" alt=${JSON.stringify(alt || "Figure")} ${title ? `caption=${JSON.stringify(title)}` : ""} />`;
      }
      const filename = path.basename(src);
      referenced.add(filename);
      const url = `${R2_BASE}/${chapter}/${encodeURIComponent(filename)}`;
      const caption = title ? ` caption=${JSON.stringify(title)}` : "";
      return `<Figure src="${url}" alt=${JSON.stringify(alt || "Figure")}${caption} />`;
    },
  );
}

function toFrontmatter(obj: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      if (v.length === 0) lines.push(`${k}: []`);
      else lines.push(`${k}:\n${v.map((x) => `  - ${JSON.stringify(x)}`).join("\n")}`);
    } else {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

function processChapter(chapter: string): void {
  const found = findMarkdown(chapter);
  if (!found) {
    console.warn(`[${chapter}] no extracted markdown found under ${EXTRACT_DIR}/${chapter}`);
    return;
  }
  const raw = fs.readFileSync(found.md, "utf8");
  const rawSections = splitSections(raw);

  const chapterMetaPath = path.join(CONTENT_DIR, chapter, "_meta.json");
  let existingMeta: Record<string, unknown> = {};
  if (fs.existsSync(chapterMetaPath)) {
    existingMeta = JSON.parse(fs.readFileSync(chapterMetaPath, "utf8"));
  }

  const outDir = path.join(CONTENT_DIR, chapter);
  fs.mkdirSync(outDir, { recursive: true });

  // Remove previously-generated section MDX files (those matching NN-slug.mdx).
  for (const f of fs.readdirSync(outDir)) {
    if (/^\d{2}-.+\.mdx$/.test(f)) fs.unlinkSync(path.join(outDir, f));
  }

  const referenced = new Set<string>();
  const sections: Section[] = [];

  rawSections.forEach((sec, idx) => {
    const order = idx;
    const slug = idx === 0 && /^introduction$/i.test(sec.title)
      ? "intro"
      : slugify(sec.title) || `section-${order}`;
    const filename = `${String(order).padStart(2, "0")}-${slug}.mdx`;

    const rewritten = sanitizeMdx(
      rewriteImages(sec.body, chapter, referenced),
    ).trim();
    const wordCount = rewritten.split(/\s+/).filter(Boolean).length;

    const fm = toFrontmatter({
      chapter,
      order,
      slug,
      title: sec.title,
      wordCount,
    });

    fs.writeFileSync(path.join(outDir, filename), `${fm}${rewritten}\n`);
    sections.push({ order, slug, title: sec.title, filename, wordCount });
  });

  // Stage images for R2 upload
  if (referenced.size > 0) {
    const stageDir = path.join(STAGE_IMG_DIR, chapter);
    fs.mkdirSync(stageDir, { recursive: true });
    for (const name of referenced) {
      const srcPath = path.join(found.dir, name);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(stageDir, name));
      } else {
        console.warn(`[${chapter}] image referenced but not found: ${name}`);
      }
    }
  }

  // Update chapter _meta.json with sections list
  const merged = {
    ...existingMeta,
    sections: sections.map((s) => ({
      order: s.order,
      slug: s.slug,
      title: s.title,
      wordCount: s.wordCount,
    })),
  };
  fs.writeFileSync(chapterMetaPath, JSON.stringify(merged, null, 2) + "\n");

  console.log(
    `[${chapter}] ${sections.length} sections written; ${referenced.size} images staged`,
  );
}

function main() {
  if (!fs.existsSync(EXTRACT_DIR)) {
    console.error(`Extract dir not found: ${EXTRACT_DIR}`);
    process.exit(1);
  }
  for (const ch of CHAPTERS) processChapter(ch);
  console.log("\nDone. Staged images at:", STAGE_IMG_DIR);
  console.log("Next: upload tmp/images/** to R2, then run indexing.");
}

main();
