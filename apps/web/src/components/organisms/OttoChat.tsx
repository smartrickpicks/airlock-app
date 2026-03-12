"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useOttoStore } from "@/stores/otto.store";
import { OTTO_SUGGESTIONS } from "@/lib/mock-otto";
import type { OttoArchetype, OttoState } from "@/components/atoms/OttoAvatar";
import ChatMessage from "@/components/molecules/ChatMessage";
import ChatInput from "@/components/molecules/ChatInput";
import PersonaSelector from "@/components/molecules/PersonaSelector";

/** Map store persona mode string → typed archetype (or undefined for Auto). */
function toArchetype(mode: string | null): OttoArchetype | undefined {
  const valid: OttoArchetype[] = [
    "analyst",
    "architect",
    "connector",
    "executor",
    "guardian",
    "strategist",
  ];
  return mode && valid.includes(mode as OttoArchetype)
    ? (mode as OttoArchetype)
    : undefined;
}

export default function OttoChat() {
  const {
    messages,
    isStreaming,
    sendMessage,
    clearHistory,
    personaMode,
    setPersonaMode,
  } = useOttoStore();
  const [input, setInput] = useState("");
  const [ottoState, setOttoState] = useState<OttoState>("active");
  const scrollRef = useRef<HTMLDivElement>(null);

  const archetype = toArchetype(personaMode);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Sync otto state with streaming
  useEffect(() => {
    if (isStreaming) {
      const lastMsg = messages[messages.length - 1];
      setOttoState(lastMsg?.content ? "active" : "thinking");
    } else {
      setOttoState("idle");
    }
  }, [isStreaming, messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
  }, [input, isStreaming, sendMessage]);

  const handleSuggestion = useCallback(
    (prompt: string) => {
      if (isStreaming) return;
      sendMessage(prompt);
    },
    [isStreaming, sendMessage],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Image
            src="/assets/brand/otto-256.png"
            alt="Otto"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-sm font-semibold text-text-primary">Otto</span>
          {isStreaming && (
            <span className="text-[10px] text-[#00D1FF] animate-pulse">
              thinking...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PersonaSelector value={personaMode} onChange={setPersonaMode} />
          <button
            onClick={clearHistory}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear chat history"
            title="Clear history"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => {
          const isLastAssistant =
            msg.role === "assistant" && i === messages.length - 1;
          return (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              embeds={msg.embeds}
              archetype={archetype}
              ottoState={isLastAssistant ? ottoState : "idle"}
              personaLabel={archetype || undefined}
              isStreaming={isLastAssistant && isStreaming}
            />
          );
        })}

        {/* Quick suggestions after welcome */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2 pl-10">
            {OTTO_SUGGESTIONS.map((sug) => (
              <button
                key={sug.id}
                onClick={() => handleSuggestion(sug.prompt)}
                className="rounded-full border border-surface-border bg-surface-overlay px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:text-[#00D1FF] hover:border-[#00D1FF]/30 transition-colors"
              >
                {sug.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isStreaming}
        placeholder="Ask Otto anything..."
      />
    </div>
  );
}
