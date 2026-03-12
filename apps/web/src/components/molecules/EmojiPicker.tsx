"use client";

import { useState, useRef, useEffect } from "react";
import { useMessengerStore } from "@/stores/messenger.store";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "🔥", "✅"];

interface EmojiPickerProps {
  messageId: string;
  conversationId: string;
}

export default function EmojiPicker({
  messageId,
  conversationId,
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const addReaction = useMessengerStore((s) => s.addReaction);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (emoji: string) => {
    addReaction(messageId, conversationId, emoji);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
        aria-label="Add reaction"
        title="Add reaction"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute bottom-full right-0 z-50 mb-1 flex gap-0.5 rounded-lg border border-white/10 bg-[#1a1a2e] p-1.5 shadow-xl">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded text-sm transition-colors hover:bg-white/10"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
