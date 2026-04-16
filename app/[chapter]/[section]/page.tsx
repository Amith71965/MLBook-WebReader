import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeKatex from "rehype-katex";
import { mdxComponents } from "@/mdx-components";
import {
  getAllSectionParams,
  getBookMeta,
  getChapterSections,
  getSectionBySlug,
  getAdjacentSections,
} from "@/lib/mlbook";
import { ChapterNav } from "@/components/mlbook/chapter-nav";
import { SectionPager } from "@/components/mlbook/section-pager";
import { ReaderShell } from "@/components/mlbook/reader-shell";

export function generateStaticParams() {
  return getAllSectionParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string; section: string }>;
}): Promise<Metadata> {
  const { chapter, section: sectionSlug } = await params;
  const book = getBookMeta();
  const chMeta = book.chapters[chapter];
  const section = getSectionBySlug(chapter, sectionSlug);
  if (!section || !chMeta) return {};
  return {
    title: `${section.frontmatter.title} — Chapter ${chMeta.number}: ${chMeta.title}`,
    description: `${section.frontmatter.title} from '${book.title}' by ${book.author}`,
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ chapter: string; section: string }>;
}) {
  const { chapter, section: sectionSlug } = await params;
  const book = getBookMeta();
  const chMeta = book.chapters[chapter];
  const section = getSectionBySlug(chapter, sectionSlug);
  if (!section || !chMeta) notFound();

  const allSections = getChapterSections(chapter);
  const { prev, next } = getAdjacentSections(chapter, sectionSlug);

  const sectionIndex =
    allSections.findIndex((s) => s.slug === sectionSlug) + 1;
  const meta = `CHAPTER ${chMeta.number} · SECTION ${sectionIndex} OF ${allSections.length} · ${section.readingTime.toUpperCase()}`;

  return (
    <div className="pt-16 pb-24 px-6 md:px-8">
      <div className="max-w-screen-xl mx-auto flex gap-10">
        {/* Sticky chapter sidebar */}
        <ChapterNav
          chapterId={chapter}
          chapterNumber={chMeta.number}
          chapterTitle={chMeta.title}
          sections={allSections.map((s) => ({
            slug: s.slug,
            title: s.frontmatter.title,
          }))}
          activeSlug={sectionSlug}
        />

        {/* Main content wrapped in ReaderShell for AI interaction */}
        <ReaderShell chapter={chMeta.number} section={sectionSlug}>
          <article className="max-w-[720px] mx-auto flex-1 min-w-0">
            {/* Breadcrumb */}
            <nav className="font-sans text-[10px] font-semibold tracking-[0.2em] text-ink-500 uppercase mb-8">
              <Link
                href="/"
                className="hover:text-ink-900 transition-colors"
              >
                ML Book
              </Link>
              <span className="mx-2">/</span>
              <Link
                href={`/${chapter}`}
                className="hover:text-ink-900 transition-colors"
              >
                Chapter {chMeta.number}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-ink-900">Section {sectionIndex}</span>
            </nav>

            {/* Section header */}
            <header className="mb-12">
              <div className="font-sans text-[0.7rem] font-semibold tracking-[0.15em] text-ink-500 mb-6 uppercase">
                {meta}
              </div>
              <h1 className="font-serif italic text-4xl md:text-6xl leading-[1.1] text-ink-900 mb-8">
                {section.frontmatter.title}
              </h1>
              <div className="h-px w-full bg-ink-500/10" />
            </header>

            {/* Article body */}
            <div className="prose prose-lg prose-stone max-w-none dropcap-wrapper">
              <MDXRemote
                source={section.content}
                components={mdxComponents}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm, remarkMath],
                    rehypePlugins: [
                      rehypeKatex,
                      [
                        rehypePrettyCode,
                        {
                          theme: "github-light",
                          keepBackground: false,
                        },
                      ],
                    ],
                  },
                }}
              />
            </div>

            {/* Notebook links */}
            {section.frontmatter.notebooks &&
              section.frontmatter.notebooks.length > 0 && (
                <div className="mt-12 pt-6 border-t border-ink-500/10">
                  <span className="font-sans text-[10px] font-bold tracking-[0.3em] text-ink-500 uppercase">
                    Related Notebooks
                  </span>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {section.frontmatter.notebooks.map((nb) => (
                      <a
                        key={nb}
                        href={`${book.githubUrl}/tree/main/codes/${nb}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-sans text-xs font-medium text-ink-700 bg-cream-100 px-3 py-1.5 rounded-full hover:bg-cream-200 transition-colors"
                      >
                        {nb}
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {/* Prev / Next */}
            <SectionPager prev={prev} next={next} />
          </article>
        </ReaderShell>
      </div>
    </div>
  );
}
