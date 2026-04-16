import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllChapterIds,
  getBookMeta,
  getChapterOverview,
  getChapterSections,
} from "@/lib/mlbook";

export function generateStaticParams() {
  return getAllChapterIds().map((chapter) => ({ chapter }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string }>;
}): Promise<Metadata> {
  const { chapter } = await params;
  const overview = getChapterOverview(chapter);
  if (!overview) return {};
  return {
    title: `Chapter ${overview.number}: ${overview.title}`,
    description: overview.description,
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const book = getBookMeta();
  const overview = getChapterOverview(chapter);
  if (!overview) notFound();

  const sections = getChapterSections(chapter);
  const chapterMeta = book.chapters[chapter];

  return (
    <div className="pt-16 pb-24 px-8 max-w-screen-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="font-sans text-[10px] font-semibold tracking-[0.2em] text-ink-500 uppercase mb-8">
        <Link href="/" className="hover:text-ink-900 transition-colors">
          ML Book
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-900">Chapter {overview.number}</span>
      </nav>

      {/* Chapter header */}
      <header className="mb-12">
        <span className="font-sans text-[10px] font-bold tracking-[0.3em] text-ink-500 uppercase">
          Chapter {overview.number}
        </span>
        <h1 className="font-serif italic text-5xl md:text-7xl tracking-tighter text-ink-900 mt-2 leading-[1.05]">
          {overview.title}
        </h1>
        <p className="font-serif text-[19px] leading-[1.75] text-ink-700 max-w-3xl mt-6">
          {overview.description}
        </p>
        <div className="flex gap-6 mt-4">
          <span className="font-sans text-[10px] font-semibold tracking-[0.15em] text-ink-400 uppercase">
            {overview.sectionCount} Sections
          </span>
          <span className="font-sans text-[10px] font-semibold tracking-[0.15em] text-ink-400 uppercase">
            {overview.totalReadingTime}
          </span>
        </div>
        <div className="h-px w-full bg-ink-500/20 mt-6" />
      </header>

      {/* Prerequisites callout */}
      {chapterMeta.prerequisites && chapterMeta.prerequisites.length > 0 && (
        <div className="bg-cream-100 rounded-3xl p-8 mb-12">
          <h3 className="font-sans text-[10px] font-bold tracking-[0.3em] text-ink-500 uppercase mb-3">
            Prerequisites
          </h3>
          <p className="font-serif text-ink-700">
            This chapter builds on concepts from:{" "}
            {chapterMeta.prerequisites.map((preReqId, i) => {
              const preMeta = book.chapters[preReqId];
              return (
                <span key={preReqId}>
                  {i > 0 && ", "}
                  <Link
                    href={`/${preReqId}`}
                    className="underline underline-offset-4 decoration-cream-300 hover:decoration-ink-900 transition-colors font-semibold"
                  >
                    Chapter {preMeta?.number}: {preMeta?.title}
                  </Link>
                </span>
              );
            })}
          </p>
        </div>
      )}

      {/* Section listing */}
      <div className="space-y-1">
        {sections.map((section, idx) => {
          const firstLine = section.content
            .split("\n")
            .find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"));
          return (
            <Link
              key={section.slug}
              href={`/${chapter}/${section.slug}`}
              className="group flex items-baseline gap-6 py-6 border-b border-ink-500/10 hover:bg-cream-100/50 -mx-4 px-4 rounded-sm transition-colors"
            >
              <span className="font-sans text-[11px] font-bold tracking-wider text-ink-400 uppercase tabular-nums shrink-0 w-8">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg md:text-xl font-bold text-ink-900 group-hover:underline decoration-1 underline-offset-4">
                  {section.frontmatter.title}
                </h3>
                {firstLine && (
                  <p className="font-serif text-sm text-ink-600 mt-1 line-clamp-2">
                    {firstLine.trim()}
                  </p>
                )}
                <span className="font-sans text-[10px] font-semibold tracking-[0.15em] text-ink-400 uppercase mt-2 inline-block">
                  {section.readingTime}
                </span>
              </div>
              <span className="font-serif text-ink-400 text-lg group-hover:text-ink-900 transition-colors shrink-0">
                &rarr;
              </span>
            </Link>
          );
        })}
      </div>

      {/* Notebooks link */}
      {chapterMeta.notebooks.length > 0 && (
        <div className="mt-12 pt-8 border-t border-ink-500/10">
          <span className="font-sans text-[10px] font-bold tracking-[0.3em] text-ink-500 uppercase">
            Companion Notebooks
          </span>
          <p className="font-serif text-ink-700 mt-2">
            Hands-on Jupyter notebooks for this chapter are available on{" "}
            <a
              href={`${book.githubUrl}/tree/main/codes/${chapterMeta.notebooks[0]}`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 decoration-cream-300 hover:decoration-ink-900 transition-colors"
            >
              GitHub &rarr;
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
