"use client";

import {
  Video,
  Clock,
  Users,
  CheckSquare,
  FileText,
  Calendar,
} from "lucide-react";
import type { Meeting, MeetingIntelligence } from "@/lib/mock-meetings";
import { MEETING_STATUS_CONFIG } from "@/lib/mock-meetings";

interface MeetingCardProps {
  meeting: Meeting;
  intelligence?: MeetingIntelligence | null;
  variant: "upcoming" | "past";
  onViewSummary?: () => void;
  onViewTranscript?: () => void;
  onViewPrepBrief?: () => void;
}

export default function MeetingCard({
  meeting,
  intelligence,
  variant,
  onViewSummary,
  onViewTranscript,
  onViewPrepBrief,
}: MeetingCardProps) {
  const statusCfg = MEETING_STATUS_CONFIG[meeting.status];

  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay p-3 transition-colors hover:bg-surface-hover">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">
            {meeting.title}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-muted">
            <Calendar size={11} />
            <span>{formatDateTime(meeting.scheduledStart)}</span>
            {meeting.durationSeconds && (
              <>
                <Clock size={11} />
                <span>{formatDuration(meeting.durationSeconds)}</span>
              </>
            )}
          </div>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${statusCfg.color}`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Participants */}
      <div className="mt-2 flex items-center gap-1.5">
        <Users size={12} className="text-text-muted flex-shrink-0" />
        <p className="truncate text-xs text-text-muted">
          {meeting.participants.map((p) => p.displayName).join(", ")}
        </p>
      </div>

      {/* Vault badge */}
      {meeting.vaultName && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <FileText size={12} className="text-text-muted flex-shrink-0" />
          <span className="truncate text-[11px] text-text-muted">
            {meeting.vaultName}
          </span>
          {meeting.module && (
            <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] text-text-muted">
              {meeting.module}
            </span>
          )}
        </div>
      )}

      {/* Intelligence summary (past meetings) */}
      {variant === "past" && intelligence && (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <CheckSquare size={11} />
            {intelligence.actionItems.length} action item
            {intelligence.actionItems.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Video size={11} />
            {intelligence.topics.length} topic
            {intelligence.topics.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-2.5 flex items-center gap-2">
        {variant === "upcoming" && onViewPrepBrief && (
          <button
            onClick={onViewPrepBrief}
            className="rounded bg-surface-hover px-2.5 py-1 text-[11px] font-medium text-accent-primary transition-colors hover:bg-surface-border"
          >
            View Prep Brief
          </button>
        )}
        {variant === "upcoming" && (
          <button className="rounded bg-accent-primary/20 px-2.5 py-1 text-[11px] font-medium text-accent-primary transition-colors hover:bg-accent-primary/30">
            Join
          </button>
        )}
        {variant === "past" && intelligence && onViewSummary && (
          <button
            onClick={onViewSummary}
            className="rounded bg-surface-hover px-2.5 py-1 text-[11px] font-medium text-accent-primary transition-colors hover:bg-surface-border"
          >
            View Summary
          </button>
        )}
        {variant === "past" && intelligence && onViewTranscript && (
          <button
            onClick={onViewTranscript}
            className="rounded bg-surface-hover px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-border"
          >
            View Transcript
          </button>
        )}
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}
