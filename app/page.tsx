import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getBookMeta, getChapterOverview } from "@/lib/mlbook";

export const metadata: Metadata = {
  title: "ML Book — Machine Learning and Artificial Intelligence",
  description:
    "An interactive web reader for 'Machine Learning and Artificial Intelligence: Concepts, Algorithms and Models' by Prof. Reza Rawassizadeh.",
};

export default function MLBookLanding() {
  const book = getBookMeta();

  return (
    <div className="pt-16 pb-24 px-8 max-w-screen-2xl mx-auto">
      {/* Masthead */}
      <header className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
          <div>
            <h1 className="font-serif text-5xl md:text-7xl tracking-tighter text-ink-900 leading-[1.05]">
              <span className="italic">Machine Learning &amp;</span>
              <br />
              <span className="font-extrabold not-italic">
                Artificial Intelligence
              </span>
            </h1>
            <p className="font-sans text-[10px] font-bold tracking-[0.3em] text-ink-500 uppercase mt-4">
              By {book.author} · {book.institution}
            </p>
          </div>
          <div className="flex gap-4">
            <a
              href={book.amazonUrl}
              target="_blank"
              rel="noreferrer"
              className="font-sans text-[10px] font-bold tracking-[0.2em] uppercase bg-ink-900 text-cream-50 px-5 py-2.5 rounded-full hover:opacity-80 transition-opacity"
            >
              Purchase Book &rarr;
            </a>
          </div>
        </div>
        <div className="h-px w-full bg-ink-500/30" />
        <p className="font-serif text-[19px] leading-[1.75] text-ink-700 max-w-3xl mt-6">
          An open-source textbook covering probability, statistics, regression,
          classification, neural networks, and self-supervised deep learning —
          presented as an interactive web reader with AI-powered study
          assistance.
        </p>
      </header>

      {/* Chapter listing by Parts */}
      {book.parts.map((part, partIdx) => {
        const isEven = partIdx % 2 === 1;
        return (
          <section
            key={part.title}
            className={`py-12 -mx-8 px-8 ${isEven ? "bg-cream-100" : ""}`}
          >
            {/* Part header */}
            <div className="mb-8">
              <span className="font-sans text-[10px] font-bold tracking-[0.3em] text-ink-500 uppercase">
                Part {toRoman(partIdx + 1)} — {part.title}
              </span>
              <div className="h-px w-full bg-ink-500/20 mt-3" />
            </div>

            {/* Chapters */}
            <div className="space-y-1">
              {part.chapters.map((chId) => {
                const overview = getChapterOverview(chId);
                if (!overview) return null;
                return (
                  <Link
                    key={chId}
                    href={`/${chId}`}
                    className="group flex items-baseline gap-6 py-5 border-b border-ink-500/10 hover:bg-cream-100/50 -mx-4 px-4 rounded-sm transition-colors"
                  >
                    <span className="font-serif text-4xl md:text-5xl text-ink-300 font-light tabular-nums shrink-0 w-16 md:w-20">
                      {overview.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-xl md:text-2xl font-bold text-ink-900 group-hover:underline decoration-1 underline-offset-4">
                        {overview.title}
                      </h3>
                      <p className="font-serif text-sm text-ink-600 mt-1 line-clamp-1">
                        {overview.description}
                      </p>
                      <div className="flex gap-4 mt-2">
                        <span className="font-sans text-[10px] font-semibold tracking-[0.15em] text-ink-400 uppercase">
                          {overview.sectionCount} Sections
                        </span>
                        <span className="font-sans text-[10px] font-semibold tracking-[0.15em] text-ink-400 uppercase">
                          {overview.totalReadingTime}
                        </span>
                      </div>
                    </div>
                    <span className="font-serif text-ink-400 text-xl group-hover:text-ink-900 transition-colors shrink-0">
                      &rarr;
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Companion Notebooks */}
      <section className="mt-16 bg-cream-100 p-10 md:p-14 rounded-3xl">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="font-sans text-[10px] font-bold tracking-[0.3em] text-ink-500 uppercase">
              Companion Resources
            </span>
            <h2 className="font-serif italic text-3xl md:text-4xl text-ink-900 mt-3 leading-tight">
              100+ Jupyter{" "}
              <span className="not-italic font-bold">Notebooks</span>
            </h2>
            <p className="font-serif text-ink-700 text-lg mt-4 max-w-md">
              Hands-on implementations across 16 chapters — from probability
              distributions to CNNs, reinforcement learning, and explainable AI.
            </p>
            <a
              href={book.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-6 font-sans text-[10px] font-bold tracking-[0.2em] uppercase bg-ink-900 text-cream-50 px-5 py-2.5 rounded-full hover:opacity-80 transition-opacity"
            >
              View on GitHub &rarr;
            </a>
          </div>
          <div className="hidden md:block relative h-[320px] rounded-3xl overflow-hidden bg-cream-50">
            <Image
              src={book.coverImage}
              alt={`${book.title} cover`}
              fill
              sizes="(min-width: 768px) 50vw, 0px"
              className="object-contain p-6"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function toRoman(n: number) {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let rem = Math.max(1, n);
  for (const [v, s] of map) {
    while (rem >= v) { out += s; rem -= v; }
  }
  return out;
}
