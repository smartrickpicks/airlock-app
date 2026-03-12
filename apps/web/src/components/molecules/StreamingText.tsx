"use client";

import { useEffect, useState, useRef } from "react";
import type { OttoState } from "@/components/atoms/OttoAvatar";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface StreamingTextProps {
  /** The full text being streamed (grows over time as tokens arrive). */
  content: string;
  /** Whether the stream is still in progress. */
  isStreaming: boolean;
  /** Called when otto state should change (thinking → active → idle). */
  onStateChange?: (state: OttoState) => void;
  className?: string;
}

/* ── Thinking Dots ─────────────────────────────────────────────────────── */

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[#00D1FF] animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#00D1FF] animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#00D1FF] animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function StreamingText({
  content,
  isStreaming,
  onStateChange,
  className = "",
}: StreamingTextProps) {
  const [phase, setPhase] = useState<"thinking" | "streaming" | "done">(
    isStreaming && !content ? "thinking" : content ? "streaming" : "done",
  );
  const prevContentLength = useRef(0);

  // Phase transitions
  useEffect(() => {
    if (isStreaming && !content) {
      setPhase("thinking");
      onStateChange?.("thinking");
    } else if (isStreaming && content) {
      setPhase("streaming");
      onStateChange?.("active");
    } else if (!isStreaming && content) {
      setPhase("done");
      onStateChange?.("idle");
    }
  }, [isStreaming, content, onStateChange]);

  // Track new content for cursor position
  useEffect(() => {
    prevContentLength.current = content.length;
  }, [content]);

  if (phase === "thinking" && !content) {
    return (
      <div className={className}>
        <ThinkingDots />
      </div>
    );
  }

  return (
    <div className={className}>
      <span>{content}</span>
      {/* Blinking cursor during active streaming */}
      {phase === "streaming" && (
        <span className="inline-block ml-0.5 w-[2px] h-[14px] align-text-bottom bg-[#00D1FF] animate-pulse" />
      )}
    </div>
  );
}

export { ThinkingDots };
