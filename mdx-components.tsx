import type { MDXComponents } from "mdx/types";

type FigureProps = {
  src: string;
  alt?: string;
  caption?: string;
};

function Figure({ src, alt, caption }: FigureProps) {
  return (
    <figure className="my-12">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? caption ?? "Figure"}
        className="rounded-3xl w-full"
        loading="lazy"
      />
      {caption ? (
        <figcaption className="mt-3 text-right font-sans text-[10px] font-semibold tracking-[0.15em] text-ink-500 uppercase">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

const baseComponents: MDXComponents = {
  Figure,
  h1: ({ children }) => (
    <h1 className="font-serif text-4xl md:text-5xl text-ink-900 tracking-tight mt-16 mb-4 leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-serif text-3xl md:text-4xl text-ink-900 tracking-tight mt-14 mb-3 leading-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-serif text-2xl text-ink-900 tracking-tight mt-10 mb-2">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="font-serif text-[19px] leading-[1.75] text-ink-900 my-6">
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="underline underline-offset-4 decoration-cream-300 hover:decoration-ink-900 transition-colors"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-6 font-serif text-[18px] leading-[1.75] text-ink-900 marker:text-ink-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-6 font-serif text-[18px] leading-[1.75] text-ink-900 marker:text-ink-400">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="my-2">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-8 border-l-2 border-cream-300 pl-5 italic text-ink-700 font-serif text-[18px]">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-10 overflow-x-auto">
      <table className="w-full border-collapse font-serif text-[17px] text-ink-900">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b-2 border-ink-900">{children}</thead>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-cream-200">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="font-sans text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-ink-700 py-3 px-4 text-left">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-3 px-4 font-serif text-[17px] text-ink-900 align-top">
      {children}
    </td>
  ),
  hr: () => <hr className="my-14 border-cream-200" />,
  code: ({ children, ...props }) => (
    <code
      className="bg-cream-100 border border-cream-200 rounded px-1.5 py-0.5 text-[0.9em] font-mono"
      {...props}
    >
      {children}
    </code>
  ),
};

export function useMDXComponents(
  components: MDXComponents = {}
): MDXComponents {
  return { ...baseComponents, ...components };
}

export const mdxComponents = baseComponents;
