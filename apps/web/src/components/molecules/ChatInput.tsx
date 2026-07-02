"use client";

import { useRef, useCallback } from "react";
import { ArrowUp } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  /** Context line shown above input (e.g. "Vault: Acme Distribution · Review · Strategist") */
  contextLabel?: string;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Message Otto...",
  contextLabel,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      // Auto-expand
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !disabled) onSend();
      }
    },
    [value, disabled, onSend],
  );

  const handleSendClick = useCallback(() => {
    if (value.trim() && !disabled) {
      onSend();
      // Reset height after send
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [value, disabled, onSend]);

  return (
    <div className="border-t border-surface-border p-3">
      {/* Context indicator */}
      {contextLabel && (
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <span className="h-1 w-1 rounded-full bg-[#00D1FF]" />
          <span className="text-[10px] font-mono text-text-muted truncate">
            {contextLabel}
          </span>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Otto is responding..." : placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
          style={{ maxHeight: 160 }}
        />
        <button
          onClick={handleSendClick}
          disabled={!value.trim() || disabled}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#00D1FF]/15 text-[#00D1FF] transition-all hover:bg-[#00D1FF]/25 disabled:opacity-20 disabled:hover:bg-[#00D1FF]/15"
          aria-label="Send message"
        >
          <ArrowUp size={14} />
        </button>
      </div>
    </div>
  );
}
