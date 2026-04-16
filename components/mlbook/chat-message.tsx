"use client";

import { useMemo } from "react";

/**
 * Renders a chat message with basic markdown and LaTeX math support.
 * Inline math: $...$ → rendered via KaTeX CSS classes
 * Display math: $$...$$ → rendered as block equations
 * Bold: **text** → <strong>
 * Code: `code` → <code>
 */
export function ChatMessage({
  role,
  content,
}: {
  role: string;
  content: string;
}) {
  const isUser = role === "user";

  const rendered = useMemo(() => renderContent(content), [content]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-3xl px-4 py-3 ${
          isUser
            ? "bg-ink-900 text-cream-50"
            : "bg-cream-50 text-ink-900 border border-ink-500/5"
        }`}
      >
        <div
          className={`text-sm leading-relaxed ${
            isUser ? "font-sans" : "font-serif"
          }`}
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      </div>
    </div>
  );
}

function renderContent(text: string): string {
  // Escape HTML
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Display math: $$...$$ → block equation
  html = html.replace(
    /\$\$([\s\S]*?)\$\$/g,
    '<div class="my-3 text-center font-mono text-xs bg-cream-100 rounded-xl px-3 py-2 overflow-x-auto">$$$1$$</div>'
  );

  // Inline math: $...$ → inline styled
  html = html.replace(
    /\$([^\$\n]+?)\$/g,
    '<span class="font-mono text-xs bg-cream-100 px-1 py-0.5 rounded">$1</span>'
  );

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Inline code: `code`
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-cream-100 border border-cream-200 rounded px-1 py-0.5 text-xs font-mono">$1</code>'
  );

  // Citations: "See Chapter X, Section: Y" → styled link
  html = html.replace(
    /See (Chapter \d+),?\s*Section:\s*([^"<\n]+)/g,
    '<span class="font-sans text-[10px] font-bold tracking-wider uppercase text-ink-500 mt-1 inline-block">See $1, Section: $2 →</span>'
  );

  // Line breaks
  html = html.replace(/\n\n/g, "</p><p class='mt-2'>");
  html = html.replace(/\n/g, "<br/>");

  return `<p>${html}</p>`;
}
