"use client";

import { useRef, useEffect, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import type { Conversation, Message } from "@/lib/mock-messenger";
import { CHAMBER_DOT_CONFIG } from "@/lib/mock-messenger";
import MessageReactions from "@/components/molecules/MessageReactions";
import EmojiPicker from "@/components/molecules/EmojiPicker";
import GifPicker from "@/components/molecules/GifPicker";

interface GifData {
  gifUrl: string;
  gifProvider: string;
  gifWidth: number;
  gifHeight: number;
}

interface ChatViewProps {
  conversation: Conversation;
  messages: Message[];
  typingUsers: string[];
  onBack: () => void;
  onSendMessage: (content: string) => void;
  onSendGif?: (gifData: GifData) => void;
}

export default function ChatView({
  conversation,
  messages,
  typingUsers,
  onBack,
  onSendMessage,
  onSendGif,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleGifSelect = (gif: {
    url: string;
    provider: string;
    width: number;
    height: number;
  }) => {
    if (onSendGif) {
      onSendGif({
        gifUrl: gif.url,
        gifProvider: gif.provider,
        gifWidth: gif.width,
        gifHeight: gif.height,
      });
    }
    setShowGifPicker(false);
  };

  const otherParticipant = conversation.participants.find(
    (p) => p.userId !== "user_self",
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2.5">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">
            {conversation.type === "dm"
              ? otherParticipant?.name || "Direct Message"
              : conversation.name || "Untitled"}
          </p>
          {conversation.type === "otto" && conversation.personaMode && (
            <span className="text-xs text-text-tertiary ml-2 capitalize">
              {conversation.personaMode} mode
            </span>
          )}
        </div>
        {conversation.type === "vault_thread" && conversation.chamber && (
          <span
            className={`h-2.5 w-2.5 rounded-full ${CHAMBER_DOT_CONFIG[conversation.chamber].color}`}
            title={CHAMBER_DOT_CONFIG[conversation.chamber].label}
          />
        )}
        {conversation.type === "dm" && otherParticipant?.online && (
          <span
            className="h-2.5 w-2.5 rounded-full bg-accent-success"
            title="Online"
          />
        )}
        {(conversation.type === "team" || conversation.type === "module") && (
          <span className="text-[10px] text-text-muted">
            {conversation.participants.length} members
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          {messages.map((msg, i) => {
            const prevMsg = messages[i - 1];
            const showDate =
              !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
            const showAuthor =
              msg.messageType !== "system" &&
              (!prevMsg ||
                prevMsg.authorId !== msg.authorId ||
                showDate ||
                prevMsg.messageType === "system");

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="my-3 flex items-center gap-2">
                    <div className="flex-1 border-t border-surface-border" />
                    <span className="text-[10px] text-text-muted">
                      {formatDateSeparator(msg.createdAt)}
                    </span>
                    <div className="flex-1 border-t border-surface-border" />
                  </div>
                )}
                {msg.messageType === "system" ? (
                  <div className="py-1 text-center">
                    <p className="text-[11px] italic text-text-muted">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <div
                    className={`group flex gap-2.5 ${showAuthor ? "mt-3" : "mt-0.5"}`}
                  >
                    {showAuthor ? (
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-semibold text-text-primary">
                        {msg.authorName.charAt(0)}
                      </div>
                    ) : (
                      <div className="w-6 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      {showAuthor && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-text-primary">
                            {msg.authorName}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      {msg.messageType === "gif" && msg.gifUrl ? (
                        <img
                          src={msg.gifUrl}
                          alt="GIF"
                          className="max-w-[240px] rounded-lg"
                          style={{
                            aspectRatio:
                              msg.gifWidth && msg.gifHeight
                                ? `${msg.gifWidth}/${msg.gifHeight}`
                                : undefined,
                          }}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed text-text-secondary break-words">
                          {msg.content}
                        </p>
                      )}
                      <MessageReactions
                        messageId={msg.id}
                        conversationId={conversation.id}
                        reactions={msg.reactions || []}
                      />
                    </div>
                    <div className="flex-shrink-0 self-center">
                      <EmojiPicker
                        messageId={msg.id}
                        conversationId={conversation.id}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="mt-2 flex items-center gap-2 px-8">
            <div className="flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
            </div>
            <span className="text-[11px] text-text-muted">
              {formatTyping(typingUsers)}
            </span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-surface-border p-3">
        <div className="relative">
          {showGifPicker && (
            <GifPicker
              onSelect={handleGifSelect}
              onClose={() => setShowGifPicker(false)}
            />
          )}
          <div className="flex items-end gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              style={{ maxHeight: 120 }}
            />
            {onSendGif && (
              <button
                type="button"
                onClick={() => setShowGifPicker(!showGifPicker)}
                className="flex-shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors"
                aria-label="Send GIF"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                  <text
                    x="12"
                    y="16"
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    stroke="none"
                    fontWeight="bold"
                  >
                    GIF
                  </text>
                </svg>
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex-shrink-0 text-text-muted hover:text-accent-primary disabled:opacity-30 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (isSameDay(iso, today.toISOString())) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(iso, yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (isSameDay(iso, today.toISOString())) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(iso, yesterday.toISOString())) {
    return `Yesterday ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTyping(users: string[]): string {
  if (users.length === 1) return `${users[0]} is typing...`;
  if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
  return `${users.length} people are typing...`;
}
