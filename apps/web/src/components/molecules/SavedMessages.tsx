"use client";

import { Bookmark, X, MessageSquare } from "lucide-react";
import { useMessengerStore } from "@/stores/messenger.store";

export default function SavedMessages({ onClose }: { onClose: () => void }) {
  const messagesMap = useMessengerStore((s) => s.messages);
  const conversations = useMessengerStore((s) => s.conversations);
  const unbookmarkMessage = useMessengerStore((s) => s.unbookmarkMessage);
  const openConversation = useMessengerStore((s) => s.openConversation);

  // Flatten all messages across conversations, then filter bookmarked ones
  const allMessages = Object.values(messagesMap).flat();
  const bookmarked = allMessages
    .filter((m) => m.bookmarked)
    .sort((a, b) => (b.bookmarkedAt || "").localeCompare(a.bookmarkedAt || ""));

  const getConversationName = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return "Unknown";
    if (conv.name) return conv.name;
    const other = conv.participants.find((p) => p.userId !== "user_self");
    return other?.name || "Direct Message";
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-[#00D1FF]" />
          <h3 className="text-sm font-semibold text-white">Saved Messages</h3>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">
            {bookmarked.length}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {bookmarked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Bookmark className="mb-2 h-8 w-8" />
            <p className="text-sm">No saved messages yet</p>
            <p className="mt-1 text-xs">Bookmark messages to find them here</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {bookmarked.map((msg) => (
              <div
                key={msg.id}
                className="group px-4 py-3 hover:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => {
                      openConversation(msg.conversationId);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#00D1FF]"
                  >
                    <MessageSquare className="h-3 w-3" />
                    {getConversationName(msg.conversationId)}
                  </button>
                  <button
                    onClick={() => unbookmarkMessage(msg.id)}
                    className="text-gray-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    title="Remove bookmark"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-300">
                  {msg.authorName}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-gray-400">
                  {msg.content}
                </p>
                {msg.bookmarkedAt && (
                  <p className="mt-1 text-xs text-gray-600">
                    Saved {new Date(msg.bookmarkedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
