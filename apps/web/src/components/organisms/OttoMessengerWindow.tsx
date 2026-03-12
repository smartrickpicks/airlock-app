"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useOttoStore } from "@/stores/otto.store";
import ChatMessage from "@/components/molecules/ChatMessage";
import ChatInput from "@/components/molecules/ChatInput";

export default function OttoMessengerWindow() {
  const messengerMessages = useOttoStore((s) => s.messengerMessages);
  const isMessengerOpen = useOttoStore((s) => s.isMessengerOpen);
  const isMessengerStreaming = useOttoStore((s) => s.isMessengerStreaming);
  const toggleMessenger = useOttoStore((s) => s.toggleMessenger);
  const sendMessengerMessage = useOttoStore((s) => s.sendMessengerMessage);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messengerMessages]);

  if (!isMessengerOpen) return null;

  const handleSend = () => {
    if (!input.trim() || isMessengerStreaming) return;
    sendMessengerMessage(input.trim());
    setInput("");
  };

  return (
    <div className="fixed bottom-12 right-4 z-50 flex w-80 flex-col rounded-t-lg border border-surface-border bg-surface-base shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Image
            src="/assets/brand/otto-256.png"
            alt="Otto"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-sm font-semibold text-text-primary">Otto</span>
        </div>
        <button
          onClick={toggleMessenger}
          className="text-text-muted hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-3"
        style={{ maxHeight: 320 }}
      >
        {messengerMessages.length === 0 && (
          <p className="text-center text-xs text-text-muted">
            Ask Otto anything about your workspace.
          </p>
        )}
        {messengerMessages.map((msg, i) => {
          const isLastAssistant =
            msg.role === "assistant" && i === messengerMessages.length - 1;
          return (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content || (isMessengerStreaming ? "" : "")}
              embeds={msg.embeds}
              isStreaming={isLastAssistant && isMessengerStreaming}
              ottoState={
                isLastAssistant && isMessengerStreaming ? "thinking" : "idle"
              }
            />
          );
        })}
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isMessengerStreaming}
        placeholder="Message Otto..."
      />
    </div>
  );
}
