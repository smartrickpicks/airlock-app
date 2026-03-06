"use client";

import {
  ArrowLeft,
  User,
  Calendar,
  FileText,
  CheckSquare,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import type { PrepBrief } from "@/lib/mock-meetings";
import { SENTIMENT_CONFIG } from "@/lib/mock-meetings";

interface PrepBriefPanelProps {
  prepBrief: PrepBrief;
  meetingTitle: string;
  onClose: () => void;
}

export default function PrepBriefPanel({
  prepBrief,
  meetingTitle,
  onClose,
}: PrepBriefPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
        <button
          onClick={onClose}
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
            Prep Brief
          </p>
          <p className="truncate text-sm font-semibold text-text-primary">
            {meetingTitle}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          {/* Attendee profiles */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <User size={12} />
              Attendee Profiles
            </h3>
            <div className="space-y-3">
              {prepBrief.attendeeProfiles.map((a) => {
                const sentCfg = SENTIMENT_CONFIG[a.sentimentTrend];
                return (
                  <div
                    key={a.contactId}
                    className="rounded-lg border border-surface-border bg-surface-overlay p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {a.name}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {a.role} at {a.company}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className={sentCfg.color} />
                        <span
                          className={`text-[10px] font-medium ${sentCfg.color}`}
                        >
                          {sentCfg.label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-text-muted">
                      <span>{a.interactionCount} interactions</span>
                      <span>
                        Last:{" "}
                        {new Date(a.lastInteraction).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    </div>
                    {a.openActionItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {a.openActionItems.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 text-[11px]"
                          >
                            <CheckSquare
                              size={10}
                              className={
                                item.status === "overdue"
                                  ? "text-accent-error"
                                  : "text-text-muted"
                              }
                            />
                            <span
                              className={
                                item.status === "overdue"
                                  ? "text-accent-error"
                                  : "text-text-secondary"
                              }
                            >
                              {item.description}
                              {item.status === "overdue" && " (overdue)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Related meetings */}
          {prepBrief.relatedMeetings.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <Calendar size={12} />
                Related Meetings
              </h3>
              <div className="space-y-2">
                {prepBrief.relatedMeetings.map((rm) => (
                  <div
                    key={rm.meetingId}
                    className="rounded-lg border border-surface-border bg-surface-overlay p-3"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-text-primary">
                        {rm.title}
                      </p>
                      <span className="flex-shrink-0 text-[10px] text-text-muted">
                        {new Date(rm.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {rm.participants.join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {rm.summary}
                    </p>
                    {rm.unresolvedItems.length > 0 && (
                      <div className="mt-1.5">
                        {rm.unresolvedItems.map((item, i) => (
                          <p key={i} className="text-[11px] text-yellow-400">
                            Unresolved: {item}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active vaults */}
          {prepBrief.activeVaults.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <FileText size={12} />
                Active Vaults
              </h3>
              <div className="space-y-2">
                {prepBrief.activeVaults.map((v) => (
                  <div
                    key={v.vaultId}
                    className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-overlay p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {v.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted">
                        <span className="rounded bg-surface-hover px-1.5 py-0.5">
                          {v.module}
                        </span>
                        <span>{v.chamber}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-text-muted">
                        {v.recentActivity}
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-text-primary">
                        {v.health}
                      </span>
                      <span className="text-[9px] text-text-muted">health</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Open tasks */}
          {prepBrief.openTasks.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <CheckSquare size={12} />
                Open Tasks ({prepBrief.openTasks.length})
              </h3>
              <div className="space-y-1.5">
                {prepBrief.openTasks.map((t) => (
                  <div
                    key={t.taskId}
                    className="flex items-center justify-between rounded border border-surface-border bg-surface-sunken p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">
                        {t.title}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {t.assignee} · Due{" "}
                        {new Date(t.due).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        t.status === "overdue"
                          ? "bg-accent-error/20 text-accent-error"
                          : "bg-surface-hover text-text-muted"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Topic threads */}
          {prepBrief.topicThreads.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <MessageCircle size={12} />
                Topic Threads
              </h3>
              <div className="space-y-2">
                {prepBrief.topicThreads.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-surface-border bg-surface-overlay p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-accent-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-accent-primary">
                        {t.topic}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {t.meetingCount} meeting
                        {t.meetingCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-text-muted">
                      First discussed{" "}
                      {new Date(t.firstMentioned).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </p>
                    {t.keyDecisions.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {t.keyDecisions.map((d, j) => (
                          <p
                            key={j}
                            className="text-[11px] text-text-secondary"
                          >
                            {d}
                          </p>
                        ))}
                      </div>
                    )}
                    {t.relatedVaultNames.length > 0 && (
                      <p className="mt-1 text-[10px] text-text-muted">
                        Vaults: {t.relatedVaultNames.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
