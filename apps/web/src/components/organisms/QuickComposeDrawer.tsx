"use client";

import { useEffect, useState } from "react";
import { Mail, MessageSquare, StickyNote, X } from "lucide-react";
import { useShellStore } from "@/stores/shell.store";
import { useNotificationStore } from "@/stores/notification.store";

type ComposeMode = "email" | "text" | "internal";

export default function QuickComposeDrawer() {
  const activeRightTool = useShellStore((s) => s.activeRightTool);
  const closeTool = useShellStore((s) => s.closeTool);
  const addToast = useNotificationStore((s) => s.addToast);
  const [mode, setMode] = useState<ComposeMode>("email");
  const [draft, setDraft] = useState(
    "@email Leah Morgan\n\nWanted to keep this moving today. We can have the agreement ready once finance confirms the payment language.",
  );

  useEffect(() => {
    if (activeRightTool !== "compose") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTool();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeRightTool, closeTool]);

  if (activeRightTool !== "compose") return null;

  return (
    <>
      <div className="fixed inset-0 z-[var(--z-overlay)]" onClick={closeTool} />
      <div className="fixed right-[68px] top-0 z-[var(--z-modal)] flex h-full w-full max-w-md flex-col border-l border-surface-border bg-surface-raised shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Quick Compose
            </div>
            <div className="text-[11px] text-text-muted">
              Stay in context while drafting outbound or internal follow-up.
            </div>
          </div>
          <button
            onClick={closeTool}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
            aria-label="Close quick compose"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-surface-border px-4 py-3">
          <ComposeTab
            label="@email"
            icon={Mail}
            isActive={mode === "email"}
            onClick={() => setMode("email")}
          />
          <ComposeTab
            label="@text"
            icon={MessageSquare}
            isActive={mode === "text"}
            onClick={() => setMode("text")}
          />
          <ComposeTab
            label="Internal"
            icon={StickyNote}
            isActive={mode === "internal"}
            onClick={() => setMode("internal")}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-xl border border-surface-border bg-surface-overlay p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Suggested Targets
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {["@owner", "@finance-team", "@email", "@text", "@legal"].map(
                (target) => (
                  <span
                    key={target}
                    className="rounded-full bg-surface-raised px-2.5 py-1 text-[10px] font-medium text-text-secondary"
                  >
                    {target}
                  </span>
                ),
              )}
            </div>
          </div>

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-4 h-[320px] w-full rounded-xl border border-surface-border bg-surface-overlay p-4 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary/40"
          />
        </div>

        <div className="border-t border-surface-border px-4 py-3">
          <div className="mb-3 text-xs text-text-muted">
            {mode === "internal"
              ? "Internal notes can be posted immediately."
              : "External sends remain human-gated in this demo pass."}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                addToast({
                  title: "Draft saved",
                  body: `${mode === "internal" ? "Internal note" : "Outbound draft"} saved to account memory.`,
                  type: "info",
                })
              }
            >
              Save Draft
            </button>
            <button
              className="rounded-full bg-accent-primary px-3 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-accent-primary-hover"
              onClick={() => {
                addToast({
                  title:
                    mode === "internal" ? "Note posted" : "Approval required",
                  body:
                    mode === "internal"
                      ? "Internal note added to shared memory."
                      : "Draft queued for human review before send.",
                  type: "success",
                });
                closeTool();
              }}
            >
              {mode === "internal" ? "Post Note" : "Queue for Approval"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ComposeTab({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: typeof Mail;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        isActive
          ? "bg-accent-primary/15 text-accent-primary"
          : "bg-surface-overlay text-text-secondary hover:text-text-primary"
      }`}
      onClick={onClick}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
