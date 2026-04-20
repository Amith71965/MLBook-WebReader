"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ChatMessage } from "./chat-message";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function ChatPanel({
  chapter,
  section,
  selectedText,
  isOpen,
  onClose,
  onClearSelection,
}: {
  chapter?: number;
  section?: string;
  selectedText?: string;
  isOpen: boolean;
  onClose: () => void;
  onClearSelection?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const lastPrefilledRef = useRef<string | null>(null);

  // Auto-fill input whenever a new selection arrives while the panel is open.
  // We compare against the last prefilled value via a ref so unrelated
  // re-renders don't keep overwriting what the user is typing.
  useEffect(() => {
    if (!isOpen || !selectedText) return;
    if (lastPrefilledRef.current === selectedText) return;
    lastPrefilledRef.current = selectedText;
    setInput(`What does this mean: "${selectedText.slice(0, 200)}"`);
    inputRef.current?.focus();
  }, [selectedText, isOpen]);

  // Reset the prefill guard + clear selection when the panel closes
  useEffect(() => {
    if (!isOpen) {
      lastPrefilledRef.current = null;
      onClearSelection?.();
    }
  }, [isOpen, onClearSelection]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input.trim(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context: {
              chapter,
              section,
              selectedText: selectedText || undefined,
            },
          }),
        });

        if (!res.ok) {
          throw new Error(`Chat API error: ${res.status}`);
        }

        // Read the streaming response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        const assistantId = `assistant-${Date.now()}`;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            assistantContent += chunk;
            setMessages([
              ...updatedMessages,
              {
                id: assistantId,
                role: "assistant",
                content: assistantContent,
              },
            ]);
          }
        }

        // Final message if no streaming happened
        if (!assistantContent) {
          const text = await res.text();
          setMessages([
            ...updatedMessages,
            {
              id: assistantId,
              role: "assistant",
              content: text || "I couldn't generate a response. Please try again.",
            },
          ]);
        }
      } catch (error) {
        console.error("Chat error:", error);
        setMessages([
          ...updatedMessages,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content:
              "Sorry, I encountered an error. Please make sure the AI service is configured and try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, chapter, section, selectedText]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-ink-900/10 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`
          fixed right-0 top-0 h-full w-full sm:w-[400px] z-50
          lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-[380px] lg:shrink-0
          bg-cream-100 border-l border-ink-500/10
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-500/10">
          <h3 className="font-sans text-[10px] font-bold tracking-[0.3em] text-ink-500 uppercase">
            Study Assistant
          </h3>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 transition-colors text-lg leading-none"
            aria-label="Close chat"
          >
            &times;
          </button>
        </div>

        {/* Selected passage chip */}
        {selectedText && (
          <div className="px-5 pt-3">
            <div className="flex items-start gap-2 bg-cream-50 border border-ink-500/10 rounded-2xl px-3 py-2">
              <span className="font-sans text-[9px] font-bold tracking-[0.2em] text-ink-500 uppercase mt-1 shrink-0">
                Asking about
              </span>
              <p className="flex-1 font-serif italic text-[13px] leading-snug text-ink-700 line-clamp-3">
                &ldquo;{selectedText.slice(0, 180)}
                {selectedText.length > 180 ? "…" : ""}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  lastPrefilledRef.current = null;
                  onClearSelection?.();
                }}
                className="text-ink-400 hover:text-ink-900 transition-colors text-base leading-none shrink-0"
                aria-label="Clear selected passage"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="font-serif italic text-ink-400 text-sm">
                Ask me anything about the textbook content. Select text in the
                reader or type a question below.
              </p>
              <div className="mt-6 space-y-2">
                {[
                  "Explain this concept simply",
                  "How does this connect to other chapters?",
                  "Can you give an example?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="block w-full text-left font-sans text-xs text-ink-500 bg-cream-50 px-3 py-2 rounded-full hover:bg-cream-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role} content={m.content} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-1 px-3 py-2">
              <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="px-5 py-4 border-t border-ink-500/10">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this section..."
              className="flex-1 bg-transparent border-b border-ink-500/20 focus:border-ink-900 outline-none font-serif italic text-sm text-ink-900 placeholder:text-ink-400 py-2 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="font-sans text-[10px] font-bold tracking-[0.2em] uppercase bg-ink-900 text-cream-50 px-3 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-30"
            >
              &rarr;
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
