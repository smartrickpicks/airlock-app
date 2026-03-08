"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { useOttoStore } from "@/stores/otto.store";

export default function OttoMessengerWindow() {
  const messengerMessages = useOttoStore((s) => s.messengerMessages);
  const isMessengerOpen = useOttoStore((s) => s.isMessengerOpen);
  const isMessengerStreaming = useOttoStore((s) => s.isMessengerStreaming);
  const toggleMessenger = useOttoStore((s) => s.toggleMessenger);
  const sendMessengerMessage = useOttoStore((s) => s.sendMessengerMessage);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messengerMessages]);

  if (!isMessengerOpen) return null;

  const handleSend = () => {
    if (!input.trim() || isMessengerStreaming) return;
    sendMessengerMessage(input.trim());
    setInput("");
  };

  return (
    <div className="fixed bottom-12 right-4 z-50 flex w-80 flex-col rounded-t-lg border border-surface-border bg-surface-base shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-3 py-2">
        <span className="text-sm font-semibold text-text-primary">Otto</span>
        <button
          onClick={toggleMessenger}
          className="text-text-muted hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto p-3"
        style={{ maxHeight: 320 }}
      >
        {messengerMessages.length === 0 && (
          <p className="text-center text-xs text-text-muted">
            Ask Otto anything about your workspace.
          </p>
        )}
        {messengerMessages.map((msg) => (
          <div
            key={msg.id}
            className={`text-xs leading-relaxed ${
              msg.role === "user"
                ? "text-right text-text-primary"
                : "text-text-secondary"
            }`}
          >
            <div
              className={`inline-block max-w-[90%] rounded-lg px-3 py-1.5 ${
                msg.role === "user"
                  ? "bg-accent-primary/15 text-text-primary"
                  : "bg-surface-raised text-text-secondary"
              }`}
            >
              {msg.content || (isMessengerStreaming ? "..." : "")}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-surface-border p-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message Otto..."
            className="flex-1 rounded bg-surface-raised px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isMessengerStreaming}
            className="text-accent-primary disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
