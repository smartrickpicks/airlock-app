"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import {
  useBrainstormStore,
  type ArtifactType,
  type BrainstormAgent,
} from "@/stores/brainstorm.store";

// Agent accent colors — each PI profile gets a distinct token-based color
const AGENT_COLORS: Record<BrainstormAgent, string> = {
  Scholar: "text-accent-primary",
  Architect: "text-accent-secondary",
  Gatekeeper: "text-chamber-review",
  Builder: "text-chamber-build",
  Controller: "text-chamber-discover",
  Orchestrator: "text-accent-success",
};

interface CreateModePanelProps {
  artifactType: ArtifactType;
  onApprove?: () => void;
}

export default function CreateModePanel({
  artifactType,
  onApprove,
}: CreateModePanelProps) {
  const { session, startSession, submitAnswer, approvePlan } =
    useBrainstormStore();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Start session on mount if not already running for this artifact type
  useEffect(() => {
    if (!session || session.artifactType !== artifactType) {
      startSession(artifactType);
    }
  }, [artifactType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom as history grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.history.length, session?.phase]);

  if (!session) return null;

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setDraft("");
    // Brief delay to feel deliberate
    setTimeout(() => {
      submitAnswer(trimmed);
      setSubmitting(false);
      textareaRef.current?.focus();
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleApprove = () => {
    approvePlan();
    onApprove?.();
  };

  const artifactLabel =
    artifactType.charAt(0).toUpperCase() + artifactType.slice(1);

  return (
    <div className="flex h-full flex-col bg-surface-base">
      {/* Header */}
      <div className="flex h-10 flex-shrink-0 items-center border-b border-surface-border bg-surface-raised px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Create a {artifactLabel}
        </span>
        {session.phase === "qa" && session.history.length > 0 && (
          <span className="ml-auto text-[10px] text-text-muted">
            {session.history.length} of{" "}
            {session.history.length + (session.currentQuestion ? 1 : 0)}{" "}
            questions answered
          </span>
        )}
      </div>

      {/* Q&A thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Past Q&A pairs */}
        {session.history.map((entry, i) => (
          <div key={i} className="space-y-1.5">
            {/* Agent question */}
            <div className="space-y-0.5">
              <span
                className={`text-[10px] font-semibold uppercase tracking-widest ${AGENT_COLORS[entry.agent]}`}
              >
                {entry.agent}
              </span>
              <p className="text-sm text-text-secondary">{entry.question}</p>
            </div>
            {/* User answer */}
            <div className="ml-3 border-l-2 border-surface-border pl-3">
              <p className="text-sm text-text-primary">{entry.answer}</p>
            </div>
          </div>
        ))}

        {/* Current question (Q&A phase) */}
        {session.phase === "qa" && session.currentQuestion && (
          <div className="space-y-0.5">
            <span
              className={`text-[10px] font-semibold uppercase tracking-widest ${AGENT_COLORS[session.currentQuestion.agent]}`}
            >
              {session.currentQuestion.agent}
            </span>
            <p className="text-sm text-text-primary">
              {session.currentQuestion.question}
            </p>
          </div>
        )}

        {/* Orchestrator generating state */}
        {session.phase === "plan" && !session.planOutput && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin text-accent-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-primary">
              Orchestrator
            </span>
            <span>Synthesizing plan…</span>
          </div>
        )}

        {/* Plan output (plan phase) */}
        {session.phase === "plan" && session.planOutput && (
          <div className="rounded-lg border border-surface-border bg-surface-raised p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-success">
                Orchestrator
              </span>
              <span className="text-xs text-text-muted">
                — Plan ready for review
              </span>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans leading-relaxed">
              {session.planOutput}
            </pre>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 rounded-md bg-accent-primary px-4 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover"
              >
                <CheckCircle size={14} />
                Approve
              </button>
              <button
                onClick={() => startSession(artifactType)}
                className="rounded-md border border-surface-border px-4 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              >
                Start over
              </button>
            </div>
          </div>
        )}

        {/* Approved confirmation */}
        {session.phase === "approved" && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle size={32} className="text-accent-success" />
            <p className="text-sm font-medium text-text-primary">
              {artifactLabel} saved to library
            </p>
            <p className="text-xs text-text-muted">
              Find it under Control Panel → {artifactLabel}s
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Answer input (Q&A phase only) */}
      {session.phase === "qa" && (
        <div className="flex-shrink-0 border-t border-surface-border bg-surface-raised p-3">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your answer… (Enter to submit, Shift+Enter for new line)"
              rows={2}
              className="flex-1 resize-none rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!draft.trim() || submitting}
              className="self-end rounded-md bg-accent-primary px-3 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Send"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
