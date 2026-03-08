"use client";

import { useMemo, useState } from "react";
import { MessageSquare, Phone, Mail, Globe } from "lucide-react";
import { MOCK_CRM_INBOX_THREADS } from "@/lib/mock-crm-enhancements";

const CHANNEL_ICON = {
  text: MessageSquare,
  email: Mail,
  web_form: Globe,
  call: Phone,
} as const;

export default function CrmInboxPage() {
  const [selectedThreadId, setSelectedThreadId] = useState(
    MOCK_CRM_INBOX_THREADS[0]?.id,
  );
  const [composerMode, setComposerMode] = useState<
    "internal" | "email" | "text"
  >("internal");
  const [statusNote, setStatusNote] = useState(
    "AI recommends a human review before any external send.",
  );
  const selectedThread = useMemo(
    () =>
      MOCK_CRM_INBOX_THREADS.find((thread) => thread.id === selectedThreadId) ??
      MOCK_CRM_INBOX_THREADS[0],
    [selectedThreadId],
  );

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Vault Inbox
          </h1>
          <p className="text-xs text-text-muted">
            Omni-channel discovery intake tied to account memory
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-primary">
          Discover
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Threads
          </div>
          <div className="divide-y divide-surface-border">
            {MOCK_CRM_INBOX_THREADS.map((thread) => {
              const Icon = CHANNEL_ICON[thread.channel];
              return (
                <button
                  key={thread.id}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-overlay ${
                    selectedThread?.id === thread.id ? "bg-surface-overlay" : ""
                  }`}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-accent-primary" />
                      <span className="text-sm font-medium text-text-primary">
                        {thread.contactName}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {thread.timestamp}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary">
                    {thread.accountName}
                  </div>
                  <div className="line-clamp-2 text-xs text-text-muted">
                    {thread.preview}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                {selectedThread.contactName}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {selectedThread.accountName}
              </p>
            </div>
            <span className="rounded-full bg-accent-primary/10 px-2 py-1 text-[11px] font-medium text-accent-primary">
              {selectedThread.unreadCount} unread
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {[
              selectedThread,
              ...MOCK_CRM_INBOX_THREADS.filter(
                (thread) => thread.id !== selectedThread.id,
              ),
            ].map((thread) => (
              <div
                key={`${thread.id}_bubble`}
                className="rounded-lg border border-surface-border bg-surface-overlay p-3"
              >
                <div className="text-[11px] text-text-muted">
                  {thread.contactName} · {thread.timestamp}
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {thread.preview}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricCard label="Intent" value={selectedThread.intent} />
            <MetricCard
              label="Confidence"
              value={`${selectedThread.confidence}%`}
            />
            <MetricCard label="Next" value={selectedThread.recommendedAction} />
          </div>

          <div className="mt-5 rounded-lg border border-surface-border bg-surface-overlay p-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["internal", "email", "text"] as const).map((mode) => (
                <button
                  key={mode}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    composerMode === mode
                      ? "bg-accent-primary text-background"
                      : "bg-surface-raised text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => setComposerMode(mode)}
                >
                  {mode === "internal"
                    ? "Internal Note"
                    : mode === "email"
                      ? "@email"
                      : "@text"}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-surface-border bg-surface-raised p-3 text-sm text-text-secondary">
              {composerMode === "internal"
                ? `@owner review ${selectedThread.accountName} before replying.`
                : composerMode === "email"
                  ? `Drafting follow-up email to ${selectedThread.contactName} with approval gate.`
                  : `Drafting text response to ${selectedThread.contactName} from the dedicated line.`}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                onClick={() =>
                  setStatusNote(
                    `Routed ${selectedThread.accountName} to qualification review.`,
                  )
                }
              >
                Route to Qualify
              </button>
              <button
                className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                onClick={() =>
                  setStatusNote(
                    `Opened ${composerMode} draft for ${selectedThread.contactName}.`,
                  )
                }
              >
                Open Draft
              </button>
              <button
                className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                onClick={() =>
                  setStatusNote(
                    `Attached this thread to ${selectedThread.accountName} memory.`,
                  )
                }
              >
                Attach to Memory
              </button>
            </div>
            <div className="mt-3 text-xs text-text-muted">{statusNote}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
