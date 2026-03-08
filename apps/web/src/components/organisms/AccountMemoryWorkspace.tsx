"use client";

import { useState } from "react";
import {
  Bot,
  Mail,
  MessageSquare,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AccountMemoryWorkspaceData } from "@/lib/mock-crm";

interface AccountMemoryWorkspaceProps {
  workspace: AccountMemoryWorkspaceData;
  accountName: string;
}

const CHANNEL_CONFIG: Record<
  string,
  { label: string; color: string; icon: LucideIcon }
> = {
  web_form: {
    label: "Web Form",
    color: "bg-accent-primary/15 text-accent-primary",
    icon: MessageSquare,
  },
  chat: {
    label: "Chat",
    color: "bg-cyan-500/15 text-cyan-300",
    icon: MessageSquare,
  },
  sms: {
    label: "Text",
    color: "bg-accent-secondary/15 text-accent-secondary",
    icon: MessageSquare,
  },
  email: {
    label: "Email",
    color: "bg-amber-500/15 text-amber-300",
    icon: Mail,
  },
  transcript: {
    label: "Transcript",
    color: "bg-purple-500/15 text-purple-300",
    icon: Mic,
  },
  upload: {
    label: "Artifact",
    color: "bg-emerald-500/15 text-emerald-300",
    icon: Paperclip,
  },
  note: {
    label: "Internal",
    color: "bg-surface-overlay text-text-secondary",
    icon: MessageSquare,
  },
  system: {
    label: "System",
    color: "bg-surface-overlay text-text-secondary",
    icon: Sparkles,
  },
};

const APPROVAL_LABELS: Record<string, string> = {
  none: "No approval",
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AccountMemoryWorkspace({
  workspace,
  accountName,
}: AccountMemoryWorkspaceProps) {
  const [composerMode, setComposerMode] = useState<
    "internal" | "email" | "text" | "call"
  >("internal");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <div className="space-y-4">
        <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-text-primary">
                  {workspace.label}
                </h4>
                {workspace.conceptBadge ? (
                  <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary">
                    {workspace.conceptBadge}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Omni-channel history, routing, and memory for {accountName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-surface-raised px-2 py-1 text-text-secondary">
                {workspace.pendingApprovals} pending approvals
              </span>
              <span className="rounded-full bg-surface-raised px-2 py-1 text-text-secondary">
                {workspace.openActionItems} open actions
              </span>
            </div>
          </div>
          {workspace.stakeholderGap ? (
            <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Missing stakeholder signal: {workspace.stakeholderGap}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Mixed Channel History
            </h4>
          </div>
          <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
            {workspace.thread.map((entry) => {
              const cfg = CHANNEL_CONFIG[entry.channelType];
              const Icon = cfg.icon;
              return (
                <div
                  key={entry.id}
                  className="rounded-lg border border-surface-border bg-surface-sunken/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
                      >
                        <Icon size={11} />
                        {cfg.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-text-muted">
                        {entry.direction}
                      </span>
                      {entry.visibility !== "system" ? (
                        <span className="text-[10px] uppercase tracking-wider text-text-muted">
                          {entry.visibility.replace("_", " ")}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-medium text-text-primary">
                      {entry.title}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                      {entry.body}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                    <span>{entry.actorName}</span>
                    {entry.targetLabel ? (
                      <span>{entry.targetLabel}</span>
                    ) : null}
                    {entry.workflowName ? (
                      <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-accent-primary">
                        {entry.workflowName}
                      </span>
                    ) : null}
                    {entry.approvalState && entry.approvalState !== "none" ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">
                        {APPROVAL_LABELS[entry.approvalState]}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "internal", label: "Internal Note", icon: MessageSquare },
              { id: "email", label: "@email", icon: Mail },
              { id: "text", label: "@text", icon: Send },
              { id: "call", label: "Future Call", icon: Mic },
            ].map((mode) => {
              const Icon = mode.icon;
              const active = composerMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() =>
                    setComposerMode(
                      mode.id as "internal" | "email" | "text" | "call",
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-accent-primary/15 text-accent-primary"
                      : "bg-surface-overlay text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Icon size={12} />
                  {mode.label}
                </button>
              );
            })}
            <span className="rounded-full bg-surface-overlay px-2 py-1 text-[11px] text-text-muted">
              @finance-team
            </span>
            <span className="rounded-full bg-surface-overlay px-2 py-1 text-[11px] text-text-muted">
              @legal
            </span>
            <span className="rounded-full bg-surface-overlay px-2 py-1 text-[11px] text-text-muted">
              @owner
            </span>
          </div>
          <div className="mt-3 rounded-lg border border-surface-border bg-surface-sunken/40 p-3">
            <p className="text-sm text-text-secondary">
              {composerMode === "internal"
                ? "Internal note mode. Mention teammates, tag stakeholder groups, and capture private context without leaving the account."
                : composerMode === "email"
                  ? "Email draft mode. External send remains approval-gated and tied to the account memory thread."
                  : composerMode === "text"
                    ? "Text draft mode. Use the dedicated line context and route through approval before sending."
                    : "Future call mode placeholder. This will eventually schedule or route telephony actions without leaving the account workspace."}
            </p>
            <div className="mt-3 rounded-lg border border-surface-border bg-surface-raised p-3 text-sm text-text-muted">
              {composerMode === "email" ? (
                <>
                  @email @leah-morgan Draft follow-up summary, include
                  transcript highlights, and request finance confirmation.
                </>
              ) : composerMode === "text" ? (
                <>
                  @text @finance-team Check if Andre can confirm payment
                  language today before we stage the draft.
                </>
              ) : composerMode === "call" ? (
                <>
                  Future call placeholder: schedule a finance review call and
                  keep the notes in this same account memory thread.
                </>
              ) : (
                <>
                  @legal-review Melissa was inferred from the transcript.
                  Confirm whether she should be added to the buying committee.
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  setStatusMessage(
                    composerMode === "internal"
                      ? "Internal note logged in demo mode."
                      : "Draft saved in demo mode. External execution remains approval-gated.",
                  )
                }
                className="rounded-md bg-accent-primary px-3 py-2 text-xs font-medium text-white"
              >
                Save Draft
              </button>
              <button
                onClick={() =>
                  setStatusMessage(
                    "Approval request generated in demo mode and attached to the account memory thread.",
                  )
                }
                className="rounded-md border border-surface-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-hover"
              >
                Request Approval
              </button>
              <button
                onClick={() =>
                  setStatusMessage(
                    "Stakeholder targeting chip added in demo mode.",
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-hover"
              >
                <UserRoundPlus size={12} />
                Target Stakeholder
              </button>
            </div>
            {statusMessage ? (
              <p className="mt-3 text-xs text-accent-primary">
                {statusMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            AI Assist
          </h4>
          <div className="mt-3 space-y-2">
            {workspace.aiAssist.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-surface-border bg-surface-sunken/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Bot size={14} className="text-accent-primary" />
                    <span className="text-sm font-medium text-text-primary">
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {item.confidence}
                  </span>
                </div>
                <p className="mt-2 text-sm text-text-secondary">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Quick Status
          </h4>
          <div className="mt-3 space-y-3 text-sm text-text-secondary">
            <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Primary Owner
              </div>
              <div className="mt-1 text-text-primary">
                {workspace.primaryOwnerName}
              </div>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Next Recommended Action
              </div>
              <div className="mt-1 text-text-primary">
                {workspace.nextRecommendedAction}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Linked Artifacts
          </h4>
          <div className="mt-3 space-y-2">
            {workspace.artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-sunken/40 px-3 py-2"
              >
                <div>
                  <div className="text-sm text-text-primary">
                    {artifact.label}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">
                    {artifact.type.replace("_", " ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-secondary">
                    {artifact.status}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {formatRelativeTime(artifact.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
