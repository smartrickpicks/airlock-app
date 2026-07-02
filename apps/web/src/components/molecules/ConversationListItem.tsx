"use client";

import { Hash, Users } from "lucide-react";
import type { Conversation } from "@/lib/mock-messenger";
import { CHAMBER_DOT_CONFIG } from "@/lib/mock-messenger";

interface ConversationListItemProps {
  conversation: Conversation;
  onClick: () => void;
}

export default function ConversationListItem({
  conversation,
  onClick,
}: ConversationListItemProps) {
  const c = conversation;
  const otherParticipant = c.participants.find((p) => p.userId !== "user_self");
  const displayName = getDisplayName(c);

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
    >
      {/* Icon / Avatar */}
      <div className="relative mt-0.5 flex-shrink-0">
        {c.type === "vault_thread" && c.chamber ? (
          <span
            className={`inline-block h-8 w-8 rounded-full ${CHAMBER_DOT_CONFIG[c.chamber].color} opacity-20`}
          >
            <span
              className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${CHAMBER_DOT_CONFIG[c.chamber].color}`}
            />
          </span>
        ) : c.type === "dm" && otherParticipant ? (
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-text-primary">
              {otherParticipant.name.charAt(0)}
            </div>
            {otherParticipant.online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-base bg-accent-success" />
            )}
          </div>
        ) : c.type === "team" ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-muted">
            <Users size={14} />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-muted">
            <Hash size={14} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-sm ${
              c.unreadCount > 0
                ? "font-semibold text-text-primary"
                : "font-medium text-text-primary"
            }`}
          >
            {displayName}
          </span>
          {c.type === "otto" && (
            <span className="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
              Otto
            </span>
          )}
          {c.lastMessage && (
            <span className="flex-shrink-0 text-[10px] text-text-muted">
              {timeAgo(c.lastMessage.timestamp)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          {c.lastMessage && (
            <p className="truncate text-xs text-text-muted">
              {c.lastMessage.authorName}: {c.lastMessage.content}
            </p>
          )}
          {c.unreadCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-accent-error px-1 text-[10px] font-semibold text-white">
              {c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function getDisplayName(c: Conversation): string {
  if (c.type === "dm") {
    const other = c.participants.find((p) => p.userId !== "user_self");
    return other?.name || "Direct Message";
  }
  return c.name || "Untitled";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
