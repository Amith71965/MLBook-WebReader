import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SectionFrontmatter = {
  chapter: number;
  section: number;
  title: string;
  slug: string;
  keywords?: string[];
  notebooks?: string[];
  prerequisites?: string[];
};

export type Section = {
  slug: string;
  chapterId: string;
  frontmatter: SectionFrontmatter;
  content: string;
  readingTime: string;
};

export type ChapterMeta = {
  number: number;
  title: string;
  description: string;
  pdfFile: string;
  notebooks: string[];
  prerequisites?: string[];
};

export type BookMeta = {
  title: string;
  subtitle: string;
  author: string;
  institution: string;
  contactEmail: string;
  amazonUrl: string;
  githubUrl: string;
  coverImage: string;
  parts: { title: string; chapters: string[] }[];
  chapters: Record<string, ChapterMeta>;
};

type ChapterSectionEntry = {
  order: number;
  slug: string;
  title: string;
  wordCount: number;
};

type ChapterSectionsMeta = {
  number: number;
  title: string;
  sections: ChapterSectionEntry[];
};

/* ------------------------------------------------------------------ */
/*  Paths                                                              */
/* ------------------------------------------------------------------ */

const MLBOOK_DIR = path.join(process.cwd(), "content", "mlbook");

/* ------------------------------------------------------------------ */
/*  Book-level                                                         */
/* ------------------------------------------------------------------ */

let _bookMeta: BookMeta | null = null;

export function getBookMeta(): BookMeta {
  if (_bookMeta) return _bookMeta;
  const raw = fs.readFileSync(path.join(MLBOOK_DIR, "_meta.json"), "utf8");
  _bookMeta = JSON.parse(raw) as BookMeta;
  return _bookMeta;
}

/* ------------------------------------------------------------------ */
/*  Chapter-level                                                      */
/* ------------------------------------------------------------------ */

function getChapterDir(chapterId: string) {
  return path.join(MLBOOK_DIR, chapterId);
}

function getChapterSectionsMeta(chapterId: string): ChapterSectionsMeta {
  const metaPath = path.join(getChapterDir(chapterId), "_meta.json");
  return JSON.parse(fs.readFileSync(metaPath, "utf8")) as ChapterSectionsMeta;
}

export function getAllChapterIds(): string[] {
  const book = getBookMeta();
  return Object.keys(book.chapters);
}

export type ChapterOverview = ChapterMeta & {
  id: string;
  sectionCount: number;
  totalReadingTime: string;
  sections: { slug: string; title: string; readingTime: string }[];
};

export function getChapterOverview(chapterId: string): ChapterOverview | null {
  const book = getBookMeta();
  const meta = book.chapters[chapterId];
  if (!meta) return null;

  const sections = getChapterSections(chapterId);
  const totalWords = sections.reduce(
    (sum, s) => sum + s.content.split(/\s+/).length,
    0
  );
  const totalMin = Math.max(1, Math.ceil(totalWords / 250));

  return {
    ...meta,
    id: chapterId,
    sectionCount: sections.length,
    totalReadingTime: `${totalMin} min read`,
    sections: sections.map((s) => ({
      slug: s.slug,
      title: s.frontmatter.title,
      readingTime: s.readingTime,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Section-level                                                      */
/* ------------------------------------------------------------------ */

function parseSectionFile(
  chapterId: string,
  entry: ChapterSectionEntry
): Section | null {
  const fileName = `${String(entry.order).padStart(2, "0")}-${entry.slug}`;
  const filePath = path.join(getChapterDir(chapterId), `${fileName}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const fm = data as SectionFrontmatter;

  return {
    slug: fm.slug ?? entry.slug,
    chapterId,
    frontmatter: fm,
    content,
    readingTime: readingTime(content).text,
  };
}

export function getChapterSections(chapterId: string): Section[] {
  const chMeta = getChapterSectionsMeta(chapterId);
  return chMeta.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((entry) => parseSectionFile(chapterId, entry))
    .filter((s): s is Section => s !== null);
}

export function getSectionBySlug(
  chapterId: string,
  sectionSlug: string
): Section | null {
  const sections = getChapterSections(chapterId);
  return sections.find((s) => s.slug === sectionSlug) ?? null;
}

/**
 * Returns previous / next sections for navigation.
 * Walks across chapter boundaries when at the first/last section.
 */
export function getAdjacentSections(
  chapterId: string,
  sectionSlug: string
): { prev: { chapter: string; slug: string; title: string } | null; next: { chapter: string; slug: string; title: string } | null } {
  const allChapters = getAllChapterIds();
  const chapterIdx = allChapters.indexOf(chapterId);
  const sections = getChapterSections(chapterId);
  const sectionIdx = sections.findIndex((s) => s.slug === sectionSlug);

  let prev: { chapter: string; slug: string; title: string } | null = null;
  let next: { chapter: string; slug: string; title: string } | null = null;

  // Previous section
  if (sectionIdx > 0) {
    const s = sections[sectionIdx - 1];
    prev = { chapter: chapterId, slug: s.slug, title: s.frontmatter.title };
  } else if (chapterIdx > 0) {
    const prevChId = allChapters[chapterIdx - 1];
    const prevSections = getChapterSections(prevChId);
    if (prevSections.length > 0) {
      const s = prevSections[prevSections.length - 1];
      prev = { chapter: prevChId, slug: s.slug, title: s.frontmatter.title };
    }
  }

  // Next section
  if (sectionIdx < sections.length - 1) {
    const s = sections[sectionIdx + 1];
    next = { chapter: chapterId, slug: s.slug, title: s.frontmatter.title };
  } else if (chapterIdx < allChapters.length - 1) {
    const nextChId = allChapters[chapterIdx + 1];
    const nextSections = getChapterSections(nextChId);
    if (nextSections.length > 0) {
      const s = nextSections[0];
      next = { chapter: nextChId, slug: s.slug, title: s.frontmatter.title };
    }
  }

  return { prev, next };
}

/**
 * Returns all valid [chapter, section] pairs for generateStaticParams.
 */
export function getAllSectionParams(): { chapter: string; section: string }[] {
  const params: { chapter: string; section: string }[] = [];
  for (const chId of getAllChapterIds()) {
    for (const s of getChapterSections(chId)) {
      params.push({ chapter: chId, section: s.slug });
    }
  }
  return params;
}
