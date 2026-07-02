"use client";

import { useState } from "react";
import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import type { Message } from "@/lib/mock-messenger";

interface PinnedMessagesProps {
  messages: Message[];
  onUnpin: (messageId: string) => void;
  onJump: (messageId: string) => void;
}

export default function PinnedMessages({
  messages,
  onUnpin,
  onJump,
}: PinnedMessagesProps) {
  const [expanded, setExpanded] = useState(false);

  if (messages.length === 0) return null;

  return (
    <div className="border-b border-surface-border bg-surface-raised/50 px-3 py-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Pin size={12} className="text-[#00D1FF] rotate-45" />
        <span className="text-[11px] font-medium text-text-primary">
          {messages.length} pinned{" "}
          {messages.length === 1 ? "message" : "messages"}
        </span>
        {expanded ? (
          <ChevronUp size={12} className="ml-auto text-text-muted" />
        ) : (
          <ChevronDown size={12} className="ml-auto text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="group flex items-start gap-2 rounded-md bg-surface-overlay px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] font-semibold text-text-primary">
                    {msg.authorName}
                  </span>
                  {msg.pinnedAt && (
                    <span className="text-[9px] text-text-muted">
                      pinned by {msg.pinnedBy}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-secondary truncate max-w-[240px]">
                  {msg.content}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onJump(msg.id);
                  }}
                  className="text-[9px] text-[#00D1FF] hover:underline"
                >
                  Jump
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(msg.id);
                  }}
                  className="text-[9px] text-text-muted hover:text-accent-danger"
                >
                  Unpin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
