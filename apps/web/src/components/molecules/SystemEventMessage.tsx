"use client";

import type { NotificationType } from "@/lib/mock-notifications";

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface SystemEventData {
  id: string;
  eventType: string;
  title: string;
  body?: string;
  severity: NotificationType;
  timestamp: string;
  /** Link to relevant module/vault */
  href?: string;
  /** Additional metadata shown as key-value pairs */
  metadata?: Record<string, string>;
}

interface SystemEventMessageProps {
  event: SystemEventData;
  onNavigate?: (href: string) => void;
}

/* ── Config ────────────────────────────────────────────────────────────── */

const SEVERITY_STYLES: Record<
  NotificationType,
  { border: string; icon: string; iconColor: string }
> = {
  info: {
    border: "border-[#00D1FF]/20",
    icon: "\u2139",
    iconColor: "text-[#00D1FF]",
  },
  success: {
    border: "border-accent-success/20",
    icon: "\u2713",
    iconColor: "text-accent-success",
  },
  warning: {
    border: "border-accent-warning/20",
    icon: "!",
    iconColor: "text-accent-warning",
  },
  error: {
    border: "border-accent-danger/20",
    icon: "\u2717",
    iconColor: "text-accent-danger",
  },
};

const EVENT_LABELS: Record<string, string> = {
  chamber_advanced: "Chamber Advanced",
  extraction_complete: "Extraction Complete",
  vault_created: "Vault Created",
  gate_cleared: "Gate Cleared",
  gate_timeout: "Gate Timeout",
  patch_submitted: "Patch Submitted",
  patch_approved: "Patch Approved",
  member_joined: "Member Joined",
  task_assigned: "Task Assigned",
  task_overdue: "Task Overdue",
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function SystemEventMessage({
  event,
  onNavigate,
}: SystemEventMessageProps) {
  const style = SEVERITY_STYLES[event.severity];
  const label = EVENT_LABELS[event.eventType] || event.eventType;

  return (
    <div
      className={`mx-auto max-w-[90%] rounded-lg border ${style.border} bg-surface-raised/50 px-3 py-2`}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <span
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-overlay text-[10px] font-bold ${style.iconColor}`}
        >
          {style.icon}
        </span>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              {label}
            </span>
            <span className="text-[9px] text-text-muted">
              {formatEventTime(event.timestamp)}
            </span>
          </div>

          <p className="mt-0.5 text-[12px] font-medium text-text-primary">
            {event.title}
          </p>

          {event.body && (
            <p className="mt-0.5 text-[11px] text-text-muted">{event.body}</p>
          )}

          {/* Metadata pills */}
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {Object.entries(event.metadata).map(([key, val]) => (
                <span
                  key={key}
                  className="rounded bg-surface-overlay px-1.5 py-0.5 text-[9px] text-text-muted"
                >
                  {key}: {val}
                </span>
              ))}
            </div>
          )}

          {/* Navigate link */}
          {event.href && onNavigate && (
            <button
              onClick={() => onNavigate(event.href!)}
              className="mt-1 text-[11px] text-[#00D1FF] hover:underline"
            >
              View details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
