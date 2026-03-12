"use client";

import { useState } from "react";
import { X, Forward, Search, MessageSquare, Users, Hash } from "lucide-react";
import { useMessengerStore } from "@/stores/messenger.store";
import type { ConversationType } from "@/lib/mock-messenger";

interface ForwardMessageModalProps {
  messageId: string;
  messageContent: string;
  senderName: string;
  onClose: () => void;
}

export default function ForwardMessageModal({
  messageId,
  messageContent,
  senderName,
  onClose,
}: ForwardMessageModalProps) {
  const [search, setSearch] = useState("");
  const conversations = useMessengerStore((s) => s.conversations);
  const activeConversationId = useMessengerStore((s) => s.activeConversationId);
  const forwardMessage = useMessengerStore((s) => s.forwardMessage);

  const filtered = conversations.filter(
    (c) =>
      c.id !== activeConversationId &&
      (c.name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleForward = (targetId: string) => {
    forwardMessage(messageId, targetId);
    onClose();
  };

  const getIcon = (type: ConversationType) => {
    switch (type) {
      case "dm":
        return <MessageSquare className="h-4 w-4 text-gray-400" />;
      case "team":
        return <Users className="h-4 w-4 text-blue-400" />;
      default:
        return <Hash className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#1a1a2e] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Forward className="h-4 w-4 text-[#00D1FF]" />
            <h3 className="text-sm font-semibold text-white">
              Forward Message
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message preview */}
        <div className="border-b border-white/5 px-4 py-2.5">
          <p className="text-xs text-gray-500">From {senderName}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-300">
            {messageContent}
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="max-h-64 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-gray-500">
              No conversations found
            </p>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleForward(conv.id)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
              >
                {getIcon(conv.type)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">
                    {conv.type === "dm"
                      ? (conv.participants.find((p) => p.userId !== "user_self")
                          ?.name ?? "Direct Message")
                      : (conv.name ?? "Untitled")}
                  </p>
                  {conv.topic && (
                    <p className="truncate text-xs text-gray-500">
                      {conv.topic}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
