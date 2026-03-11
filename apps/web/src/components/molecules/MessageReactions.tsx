"use client";

import { useMessengerStore } from "@/stores/messenger.store";

interface MessageReactionsProps {
  messageId: string;
  conversationId: string;
  reactions: { emoji: string; count: number; userReacted: boolean }[];
}

export default function MessageReactions({
  messageId,
  conversationId,
  reactions,
}: MessageReactionsProps) {
  const addReaction = useMessengerStore((s) => s.addReaction);
  const removeReaction = useMessengerStore((s) => s.removeReaction);

  if (!reactions || reactions.length === 0) return null;

  const handleClick = (emoji: string, userReacted: boolean) => {
    if (userReacted) {
      removeReaction(messageId, conversationId, emoji);
    } else {
      addReaction(messageId, conversationId, emoji);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => handleClick(r.emoji, r.userReacted)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
            r.userReacted
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "bg-surface-raised text-text-secondary border border-border-subtle hover:bg-surface-hover"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
}
