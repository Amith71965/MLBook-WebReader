"use client";

import Link from "next/link";

type NavSection = {
  slug: string;
  title: string;
};

export function ChapterNav({
  chapterId,
  chapterNumber,
  chapterTitle,
  sections,
  activeSlug,
}: {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  sections: NavSection[];
  activeSlug: string;
}) {
  return (
    <nav className="hidden lg:block w-[200px] shrink-0">
      <div className="sticky top-24">
        <Link
          href={`/${chapterId}`}
          className="font-sans text-[10px] font-bold tracking-[0.2em] text-ink-500 uppercase hover:text-ink-900 transition-colors"
        >
          Ch. {chapterNumber}
        </Link>
        <h4 className="font-serif text-sm font-bold text-ink-900 mt-1 mb-4">
          {chapterTitle}
        </h4>
        <div className="h-px w-full bg-ink-500/10 mb-4" />
        <ul className="space-y-1">
          {sections.map((s) => {
            const isActive = s.slug === activeSlug;
            return (
              <li key={s.slug}>
                <Link
                  href={`/${chapterId}/${s.slug}`}
                  className={`block py-1.5 pl-3 text-sm font-serif transition-colors border-l-2 ${
                    isActive
                      ? "border-ink-900 text-ink-900 font-semibold"
                      : "border-transparent text-ink-500 hover:text-ink-900 hover:border-ink-300"
                  }`}
                >
                  {s.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
