"use client";

import { useRef, useEffect, useState } from "react";
import { SendHorizonal, UserRound } from "lucide-react";
import AirlockIcon from "@/components/atoms/AirlockIcon";
import { useOttoSounds } from "@/hooks/useOttoSounds";
import type { CalibrationMessage } from "@/stores/calibration.store";
import type { NextQuestion } from "@/lib/mock-forge";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ForgeChatProps {
  messages: CalibrationMessage[];
  isTyping: boolean;
  confidence: number;
  phase: string;
  onSubmitAnswer: (
    questionId: string,
    optionId: string | null,
    freeText: string | null,
  ) => void;
  onContinueCalibration: () => void;
  onLaunchWorkspace: () => void;
}

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

function CalibrationCards({
  question,
  onSelect,
}: {
  question: NextQuestion;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2 ml-10">
      {question.options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className="rounded-lg border border-surface-border bg-surface-overlay px-3 py-3 text-left transition-all hover:border-accent-primary hover:bg-accent-primary/5"
        >
          <p className="text-sm font-medium text-text-primary">{opt.label}</p>
          {opt.description && (
            <p className="mt-0.5 text-[11px] text-text-muted">
              {opt.description}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}

function BMYChoice({
  onContinue,
  onLaunch,
}: {
  onContinue: () => void;
  onLaunch: () => void;
}) {
  return (
    <div className="flex gap-2 mt-2 ml-10">
      <button
        onClick={onLaunch}
        className="rounded-lg border border-surface-border bg-surface-overlay px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:border-accent-primary"
      >
        Take me to my workspace
      </button>
      <button
        onClick={onContinue}
        className="rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-primary/80"
      >
        Keep going — full picture
      </button>
    </div>
  );
}

function DeepCompleteChoice({
  onLaunch,
  onShowMath,
}: {
  onLaunch: () => void;
  onShowMath: () => void;
}) {
  return (
    <div className="flex gap-2 mt-2 ml-10">
      <button
        onClick={onLaunch}
        className="rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-primary/80"
      >
        Launch my workspace
      </button>
      <button
        onClick={onShowMath}
        className="rounded-lg border border-surface-border bg-surface-overlay px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:border-accent-primary"
      >
        Show me the math
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a message is the last of its calibrationInteraction type */
function isLastOfType(
  msg: CalibrationMessage,
  allMessages: CalibrationMessage[],
): boolean {
  if (!msg.calibrationInteraction) return false;
  const { type } = msg.calibrationInteraction;
  for (let i = allMessages.length - 1; i >= 0; i--) {
    if (allMessages[i].calibrationInteraction?.type === type) {
      return allMessages[i].id === msg.id;
    }
  }
  return false;
}

function getPlaceholder(phase: string): string {
  switch (phase) {
    case "in_progress":
      return "Or type your answer...";
    case "bmy_complete":
      return "Ask Otto anything...";
    case "deep_calibration":
      return "Tell me more...";
    case "fully_calibrated":
      return "Ask Otto anything...";
    default:
      return "Type a message...";
  }
}

/** Render message content with simple bold markdown support */
function renderContent(content: string) {
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

// Patterns that indicate an unlock event message
const UNLOCK_PATTERNS = [
  "drive bar",
  "first signal",
  "unlocked",
  "reveal",
  "archetype",
  "silhouette",
  "provenance",
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ForgeChat({
  messages,
  isTyping,
  confidence,
  phase,
  onSubmitAnswer,
  onContinueCalibration,
  onLaunchWorkspace,
}: ForgeChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  const sounds = useOttoSounds();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Play sounds when new messages arrive
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const newMessages = messages.slice(prevCount);
    prevMessageCountRef.current = messages.length;

    for (const msg of newMessages) {
      if (msg.role === "otto") {
        const interaction = msg.calibrationInteraction;

        if (interaction?.type === "profile_result") {
          sounds.dmReceived();
        } else if (interaction?.type === "launch_ready") {
          sounds.userJoin();
        } else if (
          UNLOCK_PATTERNS.some((p) => msg.content.toLowerCase().includes(p))
        ) {
          sounds.success();
        } else {
          sounds.msgReceived();
        }
      }
    }
  }, [messages, sounds]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCardSelect = (questionId: string, optionId: string) => {
    sounds.msgSent();
    onSubmitAnswer(questionId, optionId, null);
  };

  const handleTextSubmit = (questionId: string, text: string) => {
    sounds.msgSent();
    onSubmitAnswer(questionId, null, text);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Find the last message with a calibration_input or calibration_cards interaction
    // to get the current questionId
    let questionId = "freeform";
    for (let i = messages.length - 1; i >= 0; i--) {
      const ci = messages[i].calibrationInteraction;
      if (ci) {
        if (ci.type === "calibration_input") {
          questionId = ci.questionId;
          break;
        } else if (ci.type === "calibration_cards") {
          questionId = ci.question.id;
          break;
        }
      }
    }

    handleTextSubmit(questionId, trimmed);
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

  // ---------------------------------------------------------------------------
  // Render interactive elements for a message
  // ---------------------------------------------------------------------------

  function renderInteraction(msg: CalibrationMessage) {
    const ci = msg.calibrationInteraction;
    if (!ci) return null;

    // Only render interactive elements on the LAST message of that type
    if (!isLastOfType(msg, messages)) return null;

    switch (ci.type) {
      case "calibration_cards":
        return (
          <CalibrationCards
            question={ci.question}
            onSelect={(optionId) => handleCardSelect(ci.question.id, optionId)}
          />
        );

      case "calibration_input":
        // Input is handled by the composer at the bottom
        return null;

      case "bmy_choice":
        return (
          <BMYChoice
            onContinue={onContinueCalibration}
            onLaunch={onLaunchWorkspace}
          />
        );

      case "deep_complete_choice":
        return (
          <DeepCompleteChoice
            onLaunch={onLaunchWorkspace}
            onShowMath={() => {
              // "Show me the math" just launches — the provenance panel
              // reveals in ForgePreview at confidence >= 0.85
              onLaunchWorkspace();
            }}
          />
        );

      case "profile_result":
        // Profile panel is shown in ForgePreview; message text is enough here
        return null;

      case "launch_ready":
        // Success state — just the message text
        return null;

      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-surface-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/15">
          <AirlockIcon name="otto" size="sm" animate="breathe" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Otto</h2>
          <p className="text-[11px] text-text-muted">
            {confidence > 0
              ? `Calibrating... ${Math.round(confidence * 100)}% confidence`
              : "Workspace Configuration Assistant"}
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
                    <AirlockIcon name="otto" size="sm" animate="breathe" />
                  ) : (
                    <UserRound size={14} className="text-text-muted" />
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
              {msg.role === "otto" && renderInteraction(msg)}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-primary/15">
                <AirlockIcon name="otto" size="sm" animate="breathe" />
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
            placeholder={getPlaceholder(phase)}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 text-text-muted hover:text-accent-primary disabled:opacity-30 transition-colors"
          >
            <SendHorizonal size={16} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-text-muted">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
