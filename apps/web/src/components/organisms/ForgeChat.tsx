"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Bot, User } from "lucide-react";
import GoalChips from "@/components/molecules/GoalChips";
import AutonomyCards from "@/components/molecules/AutonomyCards";
import type { ForgeMessage } from "@/lib/mock-forge";
import { GOAL_CHIPS, AUTONOMY_OPTIONS } from "@/lib/mock-forge";

interface ForgeChatProps {
  messages: ForgeMessage[];
  isTyping: boolean;
  step: number;
  goalChipId: string | null;
  autonomyOptionId: string | null;
  onSendMessage: (content: string) => void;
  onSelectGoalChip: (chipId: string) => void;
  onSelectAutonomyOption: (optionId: string) => void;
}

export default function ForgeChat({
  messages,
  isTyping,
  step,
  goalChipId,
  autonomyOptionId,
  onSendMessage,
  onSelectGoalChip,
  onSelectAutonomyOption,
}: ForgeChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-surface-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/15">
          <Bot size={16} className="text-accent-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Otto</h2>
          <p className="text-[11px] text-text-muted">
            Workspace Configuration Assistant
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              {/* Message bubble */}
              <div
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                    msg.role === "otto"
                      ? "bg-accent-primary/15"
                      : "bg-surface-overlay"
                  }`}
                >
                  {msg.role === "otto" ? (
                    <Bot size={14} className="text-accent-primary" />
                  ) : (
                    <User size={14} className="text-text-muted" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.role === "otto"
                      ? "bg-surface-overlay"
                      : "bg-accent-primary/15 text-accent-primary"
                  }`}
                >
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "otto" ? "text-text-primary" : ""
                    }`}
                  >
                    {renderContent(msg.content)}
                  </p>
                </div>
              </div>

              {/* Interactive elements below Otto's messages */}
              {msg.interaction === "goal_chips" && step >= 1 && !goalChipId && (
                <div className="ml-10 mt-2">
                  <GoalChips
                    chips={GOAL_CHIPS}
                    onSelect={onSelectGoalChip}
                    selectedId={goalChipId}
                  />
                </div>
              )}

              {msg.interaction === "autonomy_cards" &&
                step >= 2 &&
                !autonomyOptionId && (
                  <div className="ml-10 mt-2">
                    <AutonomyCards
                      options={AUTONOMY_OPTIONS}
                      onSelect={onSelectAutonomyOption}
                      selectedId={autonomyOptionId}
                    />
                  </div>
                )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-primary/15">
                <Bot size={14} className="text-accent-primary" />
              </div>
              <div className="rounded-lg bg-surface-overlay px-3 py-2">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-surface-border p-4">
        <div className="flex items-end gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder(step)}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 text-text-muted hover:text-accent-primary disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-text-muted">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

/** Render message content with simple bold markdown support */
function renderContent(content: string) {
  // Split on **bold** markers
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function getPlaceholder(step: number): string {
  if (step <= 1) return "Tell Otto about your goals...";
  if (step <= 2) return "Or type your preference...";
  return "Ask Otto anything...";
}
