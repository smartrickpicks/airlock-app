"use client";

import {
  Reply,
  Pencil,
  Trash2,
  Pin,
  Bookmark,
  BookmarkCheck,
  Forward,
} from "lucide-react";
import EmojiPicker from "@/components/molecules/EmojiPicker";

interface MessageActionsProps {
  messageId: string;
  conversationId: string;
  isOwnMessage: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin?: () => void;
  onBookmark?: () => void;
  onForward?: () => void;
}

export default function MessageActions({
  messageId,
  conversationId,
  isOwnMessage,
  isPinned,
  isBookmarked,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onBookmark,
  onForward,
}: MessageActionsProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-surface-border bg-surface-raised px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
      <button
        onClick={onReply}
        className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
        aria-label="Reply"
      >
        <Reply size={14} />
      </button>
      {onForward && (
        <button
          onClick={onForward}
          className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
          aria-label="Forward"
        >
          <Forward size={14} />
        </button>
      )}
      {onPin && (
        <button
          onClick={onPin}
          className={`p-1 rounded transition-colors ${isPinned ? "text-[#00D1FF]" : "text-text-muted hover:text-text-primary"}`}
          aria-label={isPinned ? "Unpin" : "Pin"}
        >
          <Pin size={14} className={isPinned ? "rotate-45" : ""} />
        </button>
      )}
      {onBookmark && (
        <button
          onClick={onBookmark}
          className={`p-1 rounded transition-colors ${isBookmarked ? "text-[#00D1FF]" : "text-text-muted hover:text-text-primary"}`}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
        >
          {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>
      )}
      <EmojiPicker messageId={messageId} conversationId={conversationId} />
      {isOwnMessage && (
        <>
          <button
            onClick={onEdit}
            className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
            aria-label="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-text-muted hover:text-accent-danger rounded transition-colors"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
}
