"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useMessengerStore } from "@/stores/messenger.store";

interface MessageReactionsProps {
  messageId: string;
  conversationId: string;
  reactions: { emoji: string; count: number; userReacted: boolean }[];
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "🔥", "✅"];

export default function MessageReactions({
  messageId,
  conversationId,
  reactions,
}: MessageReactionsProps) {
  const [showQuickPick, setShowQuickPick] = useState(false);
  const addReaction = useMessengerStore((s) => s.addReaction);
  const removeReaction = useMessengerStore((s) => s.removeReaction);

  const handleClick = (emoji: string, userReacted: boolean) => {
    if (userReacted) {
      removeReaction(messageId, conversationId, emoji);
    } else {
      addReaction(messageId, conversationId, emoji);
    }
  };

  const existingEmojis = new Set(reactions.map((r) => r.emoji));
  const availableQuickEmojis = QUICK_EMOJIS.filter(
    (e) => !existingEmojis.has(e),
  );

  const hasReactions = reactions && reactions.length > 0;

  if (!hasReactions && !showQuickPick) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => handleClick(r.emoji, r.userReacted)}
          title={r.userReacted ? "Remove reaction" : "Add reaction"}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
            r.userReacted
              ? "bg-[#00D1FF]/15 border border-[#00D1FF]/30 text-white"
              : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="text-[10px]">{r.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowQuickPick(!showQuickPick)}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
          title="Add reaction"
          aria-label="Add reaction"
        >
          <Plus className="h-3 w-3" />
        </button>

        {showQuickPick && (
          <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-lg border border-white/10 bg-[#1a1a2e] p-1.5 shadow-xl">
            {availableQuickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  addReaction(messageId, conversationId, emoji);
                  setShowQuickPick(false);
                }}
                className="rounded p-1 text-sm transition-colors hover:bg-white/10"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            {availableQuickEmojis.length === 0 && (
              <span className="px-2 py-1 text-[11px] text-gray-500">
                All reactions added
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
