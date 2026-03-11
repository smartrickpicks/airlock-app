"use client";

import { useRef, useEffect, useState } from "react";
import { Bot, Send, Trash2 } from "lucide-react";
import { useOttoStore } from "@/stores/otto.store";
import { OTTO_SUGGESTIONS } from "@/lib/mock-otto";
import type { OttoMessage } from "@/lib/mock-otto";
import PersonaSelector from "@/components/molecules/PersonaSelector";

export default function OttoChat() {
  const {
    messages,
    isStreaming,
    sendMessage,
    clearHistory,
    personaMode,
    setPersonaMode,
  } = useOttoStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (prompt: string) => {
    if (isStreaming) return;
    sendMessage(prompt);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary/15">
            <Bot size={14} className="text-accent-primary" />
          </div>
          <span className="text-sm font-semibold text-text-primary">Otto</span>
          {isStreaming && (
            <span className="text-[10px] text-accent-primary animate-pulse">
              typing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PersonaSelector value={personaMode} onChange={setPersonaMode} />
          <button
            onClick={clearHistory}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear chat history"
            title="Clear history"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Quick suggestions after welcome */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {OTTO_SUGGESTIONS.map((sug) => (
              <button
                key={sug.id}
                onClick={() => handleSuggestion(sug.prompt)}
                className="rounded-full border border-surface-border bg-surface-overlay px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:text-accent-primary hover:border-accent-primary/30 transition-colors"
              >
                {sug.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-surface-border p-3">
        <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming ? "Otto is responding..." : "Ask Otto anything..."
            }
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 text-text-muted hover:text-accent-primary disabled:opacity-30 transition-colors"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[9px] text-text-muted">
          Otto uses AI to assist. Always verify critical information.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: OttoMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-accent-primary/15 text-text-primary"
            : "bg-surface-overlay text-text-secondary"
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="otto-markdown space-y-2">
            {message.content.split("\n").map((line, i) => {
              if (!line.trim()) return <br key={i} />;

              // Bold headings
              if (line.startsWith("**") && line.endsWith("**")) {
                return (
                  <p key={i} className="font-semibold text-text-primary">
                    {line.replace(/\*\*/g, "")}
                  </p>
                );
              }

              // Numbered/bulleted lists
              if (
                /^[\d]+\./.test(line.trim()) ||
                line.trim().startsWith("- ")
              ) {
                const formatted = line
                  .replace(/\*\*(.+?)\*\*/g, "$1")
                  .replace(/--/g, "\u2014");
                return (
                  <p key={i} className="pl-2 text-text-secondary">
                    {formatted}
                  </p>
                );
              }

              // Inline bold
              const parts = line.split(/(\*\*.+?\*\*)/g);
              return (
                <p key={i}>
                  {parts.map((part, j) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <span key={j} className="font-semibold text-text-primary">
                        {part.replace(/\*\*/g, "")}
                      </span>
                    ) : (
                      <span key={j}>{part.replace(/--/g, "\u2014")}</span>
                    ),
                  )}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
