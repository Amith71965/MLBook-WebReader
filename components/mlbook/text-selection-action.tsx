"use client";

import { useEffect, useState, useCallback } from "react";

export function TextSelectionAction({
  onAskAI,
}: {
  onAskAI: (text: string) => void;
}) {
  const [selection, setSelection] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const handleMouseUp = useCallback(() => {
    // Slight delay to let the browser finalize selection
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();

      if (text && text.length > 3 && text.length < 500) {
        const range = sel?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (rect) {
          setSelection({
            text,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
        }
      } else {
        setSelection(null);
      }
    }, 10);
  }, []);

  const handleMouseDown = useCallback(() => {
    setSelection(null);
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [handleMouseUp, handleMouseDown]);

  if (!selection) return null;

  return (
    <div
      className="fixed z-50 -translate-x-1/2 -translate-y-full animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ left: selection.x, top: selection.y }}
    >
      <button
        onClick={() => {
          onAskAI(selection.text);
          setSelection(null);
        }}
        className="flex items-center gap-1.5 bg-cream-100 border border-ink-500/10 shadow-sm text-ink-900 px-3 py-1.5 rounded-full font-sans text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-cream-200 transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
        Ask AI about this &rarr;
      </button>
    </div>
  );
}
