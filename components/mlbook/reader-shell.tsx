"use client";

import { useState, useCallback } from "react";
import { ChatPanel } from "./chat-panel";
import { TextSelectionAction } from "./text-selection-action";

/**
 * Client-side shell that wraps the server-rendered section content
 * and provides the AI chat panel + text selection interaction.
 */
export function ReaderShell({
  chapter,
  section,
  children,
}: {
  chapter?: number;
  section?: string;
  children: React.ReactNode;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string | undefined>();

  const handleAskAI = useCallback((text: string) => {
    setSelectedText(text);
    setChatOpen(true);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedText(undefined);
  }, []);

  return (
    <div className="flex gap-0 relative">
      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Text selection tooltip */}
      <TextSelectionAction onAskAI={handleAskAI} />

      {/* Floating AI button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-12 h-12 bg-ink-900 text-cream-50 rounded-full shadow-[0_4px_40px_rgba(0,0,0,0.04)] flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Open study assistant"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      <ChatPanel
        chapter={chapter}
        section={section}
        selectedText={selectedText}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
}
