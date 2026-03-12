"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  ArrowLeft,
  Send,
  Reply,
  X,
  Paperclip,
  Archive,
  Forward,
} from "lucide-react";
import type { Conversation, Message } from "@/lib/mock-messenger";
import { CHAMBER_DOT_CONFIG } from "@/lib/mock-messenger";
import MessageReactions from "@/components/molecules/MessageReactions";
import GifPicker from "@/components/molecules/GifPicker";
import FilePreview from "@/components/molecules/FilePreview";
import MentionTypeahead from "@/components/molecules/MentionTypeahead";
import type { MentionOption } from "@/components/molecules/MentionTypeahead";
import MessageActions from "@/components/molecules/MessageActions";
import PinnedMessages from "@/components/molecules/PinnedMessages";
import LinkPreview from "@/components/molecules/LinkPreview";
import ForwardMessageModal from "@/components/molecules/ForwardMessageModal";
import { useMessengerStore } from "@/stores/messenger.store";
import PersonaSelector from "@/components/molecules/PersonaSelector";
import UserStatusBadge from "@/components/molecules/UserStatusBadge";
import { apiFetch } from "@/lib/api";

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
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<{
    id: string;
    content: string;
    senderName: string;
  } | null>(null);
  const [mentionState, setMentionState] = useState<{
    active: boolean;
    query: string;
    startIndex: number;
    results: MentionOption[];
    activeIndex: number;
  } | null>(null);
  const sendTypingIndicator = useMessengerStore((s) => s.sendTypingIndicator);
  const archiveConversation = useMessengerStore((s) => s.archiveConversation);
  const setConversationPersonaMode = useMessengerStore(
    (s) => s.setConversationPersonaMode,
  );
  const replyTo = useMessengerStore((s) => s.replyTo);
  const setReplyTo = useMessengerStore((s) => s.setReplyTo);
  const clearReplyTo = useMessengerStore((s) => s.clearReplyTo);
  const sendFileMessage = useMessengerStore((s) => s.sendFileMessage);
  const editingMessageId = useMessengerStore((s) => s.editingMessageId);
  const deletingMessageId = useMessengerStore((s) => s.deletingMessageId);
  const setEditingMessage = useMessengerStore((s) => s.setEditingMessage);
  const setDeletingMessage = useMessengerStore((s) => s.setDeletingMessage);
  const editMessage = useMessengerStore((s) => s.editMessage);
  const deleteMessage = useMessengerStore((s) => s.deleteMessage);
  const pinMessage = useMessengerStore((s) => s.pinMessage);
  const unpinMessage = useMessengerStore((s) => s.unpinMessage);
  const bookmarkMessage = useMessengerStore((s) => s.bookmarkMessage);
  const unbookmarkMessage = useMessengerStore((s) => s.unbookmarkMessage);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMentionQueryRef = useRef<string>("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (stagedFile) {
      const blobUrl = URL.createObjectURL(stagedFile);
      sendFileMessage(conversation.id, {
        fileName: stagedFile.name,
        fileSize: stagedFile.size,
        fileUrl: blobUrl,
        fileMimeType: stagedFile.type,
      });
      setStagedFile(null);
      return;
    }
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput("");
    setMentionState(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      setStagedFile(files[0]);
    }
  };

  const handleMentionSelect = (option: MentionOption) => {
    if (!mentionState) return;
    const before = input.slice(0, mentionState.startIndex);
    const after = input.slice(
      mentionState.startIndex + 1 + mentionState.query.length,
    );
    setInput(`${before}@${option.name} ${after}`);
    setMentionState(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionState?.active && mentionState.results.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionState((prev) =>
          prev
            ? {
                ...prev,
                activeIndex: (prev.activeIndex + 1) % prev.results.length,
              }
            : prev,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionState((prev) =>
          prev
            ? {
                ...prev,
                activeIndex:
                  (prev.activeIndex - 1 + prev.results.length) %
                  prev.results.length,
              }
            : prev,
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = mentionState.results[mentionState.activeIndex];
        if (selected) {
          handleMentionSelect(selected);
        }
        return;
      }
    }

    if (e.key === "Escape" && mentionState?.active) {
      setMentionState(null);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (stagedFile || input.trim()) handleSend();
    }
  };

  const handleInput = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    if (conversation?.id) {
      sendTypingIndicator(conversation.id);
    }
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;

    const cursorPos = e.target.selectionStart ?? value.length;
    const detected = detectMention(value, cursorPos);

    if (detected.active && detected.query.length >= 1) {
      if (
        detected.query === lastMentionQueryRef.current &&
        mentionState?.active
      ) {
        return;
      }
      lastMentionQueryRef.current = detected.query;

      let results: MentionOption[] = [];
      try {
        const data = await apiFetch<MentionOption[]>(
          `/api/chat/people?q=${encodeURIComponent(detected.query)}&limit=5`,
        );
        results = data;
      } catch {
        // Fallback: filter conversation participants by name
        const q = detected.query.toLowerCase();
        results = conversation.participants
          .filter(
            (p) => p.userId !== "user_self" && p.name.toLowerCase().includes(q),
          )
          .map((p) => ({
            userId: p.userId,
            name: p.name,
            avatarUrl: p.avatarUrl,
          }));
      }

      setMentionState({
        active: true,
        query: detected.query,
        startIndex: detected.startIndex,
        results,
        activeIndex: 0,
      });
    } else {
      lastMentionQueryRef.current = "";
      setMentionState(null);
    }
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

  const pinnedMessages = messages.filter((m) => m.pinned);

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
          {conversation.topic && (
            <p className="text-[10px] text-text-muted truncate">
              {conversation.topic}
            </p>
          )}
          {conversation.type === "otto" && (
            <div className="mt-0.5">
              <PersonaSelector
                value={conversation.personaMode ?? null}
                onChange={(mode) =>
                  setConversationPersonaMode(conversation.id, mode)
                }
              />
            </div>
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
        {conversation.type !== "otto" && (
          <button
            onClick={() => archiveConversation(conversation.id)}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            aria-label={conversation.archived ? "Unarchive" : "Archive"}
            title={conversation.archived ? "Unarchive" : "Archive"}
          >
            <Archive size={14} />
          </button>
        )}
      </div>

      <PinnedMessages
        messages={pinnedMessages}
        onUnpin={(id) => unpinMessage(conversation.id, id)}
        onJump={(id) => {
          const el = document.getElementById(`msg-${id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

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
              <div key={msg.id} id={`msg-${msg.id}`}>
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
                          {msg.authorId && (
                            <UserStatusBadge userId={msg.authorId} />
                          )}
                          <span className="text-[10px] text-text-muted">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      {msg.replyPreview && (
                        <div className="mb-1 border-l-2 border-[#00D1FF]/40 pl-2">
                          <span className="text-[11px] font-medium text-text-primary">
                            {msg.replyPreview.authorName}
                          </span>
                          <p className="text-[11px] text-text-muted truncate max-w-[200px]">
                            {msg.replyPreview.content}
                          </p>
                        </div>
                      )}
                      {msg.forwardedFrom && (
                        <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                          <Forward className="h-3 w-3" />
                          <span>
                            Forwarded from{" "}
                            <span className="text-gray-400">
                              {msg.forwardedFrom.senderName}
                            </span>{" "}
                            in {msg.forwardedFrom.conversationName}
                          </span>
                        </div>
                      )}
                      {msg.messageType === "file" && msg.fileName ? (
                        <FilePreview
                          fileName={msg.fileName}
                          fileSize={msg.fileSize}
                          fileUrl={msg.fileUrl}
                          fileMimeType={msg.fileMimeType}
                        />
                      ) : msg.messageType === "gif" && msg.gifUrl ? (
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
                      ) : editingMessageId === msg.id ? (
                        <div className="space-y-1">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                editMessage(
                                  conversation.id,
                                  msg.id,
                                  editContent,
                                );
                              }
                              if (e.key === "Escape") setEditingMessage(null);
                            }}
                            className="w-full resize-none rounded border border-surface-border bg-surface-overlay px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-[#00D1FF]/50"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2 text-[10px]">
                            <span className="text-text-muted">
                              Enter to save · Escape to cancel
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed text-text-secondary break-words">
                          {renderMessageContent(msg.content)}
                          {msg.editedAt && (
                            <span className="text-[9px] text-text-muted ml-1">
                              (edited)
                            </span>
                          )}
                        </p>
                      )}
                      {/* Link previews */}
                      {msg.linkPreviews && msg.linkPreviews.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {msg.linkPreviews.map((preview, idx) => (
                            <LinkPreview key={idx} preview={preview} />
                          ))}
                        </div>
                      )}
                      {deletingMessageId === msg.id && (
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                          <span className="text-text-muted">
                            Delete this message?
                          </span>
                          <button
                            onClick={() =>
                              deleteMessage(conversation.id, msg.id)
                            }
                            className="text-accent-danger hover:underline"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeletingMessage(null)}
                            className="text-text-muted hover:text-text-primary"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      <MessageReactions
                        messageId={msg.id}
                        conversationId={conversation.id}
                        reactions={msg.reactions || []}
                      />
                    </div>
                    <div className="flex-shrink-0 self-start">
                      <MessageActions
                        messageId={msg.id}
                        conversationId={conversation.id}
                        isOwnMessage={msg.authorId === "user_self"}
                        isPinned={msg.pinned}
                        isBookmarked={msg.bookmarked}
                        onReply={() =>
                          setReplyTo(msg.id, msg.authorName, msg.content)
                        }
                        onForward={() =>
                          setForwardingMessage({
                            id: msg.id,
                            content: msg.content,
                            senderName: msg.authorName,
                          })
                        }
                        onEdit={() => {
                          setEditingMessage(msg.id);
                          setEditContent(msg.content);
                        }}
                        onDelete={() => setDeletingMessage(msg.id)}
                        onPin={() =>
                          msg.pinned
                            ? unpinMessage(conversation.id, msg.id)
                            : pinMessage(conversation.id, msg.id)
                        }
                        onBookmark={() => {
                          if (msg.bookmarked) {
                            unbookmarkMessage(msg.id);
                          } else {
                            bookmarkMessage(msg.id);
                          }
                        }}
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

      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-surface-border px-3 py-1.5 bg-surface-overlay/50">
          <Reply size={12} className="text-[#00D1FF]" />
          <span className="text-[11px] text-text-muted">
            Replying to{" "}
            <span className="text-text-primary font-medium">
              {replyTo.authorName}
            </span>
          </span>
          <button
            onClick={clearReplyTo}
            className="ml-auto text-text-muted hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Composer */}
      <div
        className="relative border-t border-surface-border p-3"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) setStagedFile(files[0]);
        }}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-[#00D1FF]/50 bg-surface-overlay/80">
            <span className="text-sm text-[#00D1FF]">Drop file to share</span>
          </div>
        )}
        <div className="relative">
          {showGifPicker && (
            <GifPicker
              onSelect={handleGifSelect}
              onClose={() => setShowGifPicker(false)}
            />
          )}
          {mentionState?.active && mentionState.results.length > 0 && (
            <div className="relative">
              <div className="absolute bottom-full left-0 right-0 mb-1 z-10">
                <MentionTypeahead
                  query={mentionState.query}
                  options={mentionState.results}
                  onSelect={handleMentionSelect}
                  onClose={() => setMentionState(null)}
                  activeIndex={mentionState.activeIndex}
                />
              </div>
            </div>
          )}
          <div className="rounded-lg border border-surface-border bg-surface-overlay">
            {stagedFile && (
              <div className="flex items-center gap-2 border-b border-surface-border px-3 py-1.5">
                <Paperclip size={12} className="text-text-muted" />
                <span className="text-[11px] text-text-primary truncate">
                  {stagedFile.name}
                </span>
                <span className="text-[10px] text-text-muted">
                  {stagedFile.size < 1024 * 1024
                    ? `${(stagedFile.size / 1024).toFixed(1)} KB`
                    : `${(stagedFile.size / (1024 * 1024)).toFixed(1)} MB`}
                </span>
                <button
                  onClick={() => setStagedFile(null)}
                  className="ml-auto text-text-muted hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 px-3 py-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  stagedFile
                    ? "Add a message (optional)..."
                    : "Type a message..."
                }
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                style={{ maxHeight: 120 }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors"
                aria-label="Attach file"
              >
                <Paperclip size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setStagedFile(file);
                  e.target.value = "";
                }}
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
                disabled={!input.trim() && !stagedFile}
                className="flex-shrink-0 text-text-muted hover:text-accent-primary disabled:opacity-30 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {forwardingMessage && (
        <ForwardMessageModal
          messageId={forwardingMessage.id}
          messageContent={forwardingMessage.content}
          senderName={forwardingMessage.senderName}
          onClose={() => setForwardingMessage(null)}
        />
      )}
    </div>
  );
}

function detectMention(
  value: string,
  cursorPos: number,
): { active: boolean; query: string; startIndex: number } {
  let i = cursorPos - 1;
  while (i >= 0 && value[i] !== "@" && value[i] !== " " && value[i] !== "\n") {
    i--;
  }
  if (
    i >= 0 &&
    value[i] === "@" &&
    (i === 0 || value[i - 1] === " " || value[i - 1] === "\n")
  ) {
    const query = value.slice(i + 1, cursorPos);
    return { active: true, query, startIndex: i };
  }
  return { active: false, query: "", startIndex: -1 };
}

function renderMessageContent(content: string): React.ReactNode {
  // Handle code blocks first (```...```)
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const segments: { type: "text" | "codeblock"; value: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }
    segments.push({ type: "codeblock", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments.map((seg, i) => {
    if (seg.type === "codeblock") {
      return (
        <pre
          key={i}
          className="my-1 rounded bg-surface-overlay p-2 text-[13px] font-mono overflow-x-auto"
        >
          <code>{seg.value.trim()}</code>
        </pre>
      );
    }
    return <span key={i}>{renderInlineMarkdown(seg.value)}</span>;
  });
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Process inline formatting: bold, italic, strikethrough, inline code, mentions
  const parts = text.split(
    /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|~~[^~]+~~|@[\w][\w\s]*?\b)/g,
  );

  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={i}
          className="rounded bg-surface-overlay px-1 text-[13px] font-mono text-[#00D1FF]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (
      (part.startsWith("*") &&
        part.endsWith("*") &&
        part.length > 2 &&
        !part.startsWith("**")) ||
      (part.startsWith("_") && part.endsWith("_") && part.length > 2)
    ) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      return (
        <del key={i} className="text-text-muted">
          {part.slice(2, -2)}
        </del>
      );
    }
    if (part.startsWith("@")) {
      return (
        <span
          key={i}
          className="rounded bg-[#00D1FF]/15 px-0.5 text-[#00D1FF] font-medium"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
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
