import Link from "next/link";

type Adjacent = {
  chapter: string;
  slug: string;
  title: string;
} | null;

export function SectionPager({
  prev,
  next,
}: {
  prev: Adjacent;
  next: Adjacent;
}) {
  if (!prev && !next) return null;

  return (
    <div className="mt-16 pt-8 border-t border-ink-500/10 grid grid-cols-2 gap-4">
      {prev ? (
        <Link
          href={`/${prev.chapter}/${prev.slug}`}
          className="group flex flex-col items-start py-4"
        >
          <span className="font-sans text-[10px] font-bold tracking-[0.2em] text-ink-400 uppercase">
            &larr; Previous
          </span>
          <span className="font-serif text-ink-900 mt-1 group-hover:underline decoration-1 underline-offset-4">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/${next.chapter}/${next.slug}`}
          className="group flex flex-col items-end py-4 text-right"
        >
          <span className="font-sans text-[10px] font-bold tracking-[0.2em] text-ink-400 uppercase">
            Next &rarr;
          </span>
          <span className="font-serif text-ink-900 mt-1 group-hover:underline decoration-1 underline-offset-4">
            {next.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
