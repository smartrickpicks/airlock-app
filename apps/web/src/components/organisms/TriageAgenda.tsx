"use client";

import type { Task } from "@/lib/mock-tasks";
import { SEVERITY_CONFIG, TASK_STATUS_CONFIG } from "@/lib/mock-tasks";

interface TriageAgendaProps {
  tasks: Task[];
}

type DateGroup = "overdue" | "today" | "tomorrow" | "this_week" | "later";

const GROUP_LABELS: Record<DateGroup, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This Week",
  later: "Later",
};

const GROUP_ORDER: DateGroup[] = [
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "later",
];

function getDateGroup(dueAt: string | null): DateGroup {
  if (!dueAt) return "later";

  const now = new Date();
  const due = new Date(dueAt);

  // Strip time for date comparison
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffDays = Math.round(
    (dueDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays <= 7) return "this_week";
  return "later";
}

function formatDueDate(dueAt: string): string {
  const date = new Date(dueAt);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDueCountdown(dueAt: string): { text: string; color: string } {
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 0) {
    return {
      text: `${Math.abs(diffHours)}h overdue`,
      color: "text-accent-danger",
    };
  }
  if (diffHours < 24) {
    return { text: `Due in ${diffHours}h`, color: "text-amber-400" };
  }
  const diffDays = Math.round(diffHours / 24);
  return { text: `Due in ${diffDays}d`, color: "text-text-muted" };
}

const GROUP_HEADER_STYLES: Record<DateGroup, string> = {
  overdue: "bg-accent-danger/10 text-accent-danger",
  today: "bg-accent-primary/10 text-accent-primary",
  tomorrow: "bg-amber-500/10 text-amber-400",
  this_week: "bg-surface-overlay text-text-muted",
  later: "bg-surface-overlay text-text-muted",
};

export default function TriageAgenda({ tasks }: TriageAgendaProps) {
  // Sort tasks by due date (nulls last)
  const sorted = [...tasks].sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  // Group by date bucket
  const grouped = new Map<DateGroup, Task[]>();
  for (const task of sorted) {
    const group = getDateGroup(task.dueAt);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(task);
  }

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-text-muted">
          No triage items match the current filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {GROUP_ORDER.filter((g) => grouped.has(g)).map((group) => {
        const groupTasks = grouped.get(group)!;
        const headerStyle = GROUP_HEADER_STYLES[group];

        return (
          <div key={group}>
            {/* Group header */}
            <div
              className={`mb-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${headerStyle}`}
            >
              {GROUP_LABELS[group]} ({groupTasks.length})
            </div>

            {/* Items */}
            <div className="flex flex-col gap-1">
              {groupTasks.map((task) => {
                const severity = SEVERITY_CONFIG[task.severity];
                const statusCfg = TASK_STATUS_CONFIG[task.status];
                const countdown = task.dueAt
                  ? formatDueCountdown(task.dueAt)
                  : null;

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-raised p-3 hover:border-text-muted/30 transition-colors cursor-pointer"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${severity.dotColor}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary">
                        {task.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${severity.color}`}
                        >
                          {severity.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusCfg.color}`}
                          />
                          <span>{statusCfg.label}</span>
                        </div>
                        {task.vaultName && (
                          <>
                            <span className="text-text-muted/40">&gt;</span>
                            <span>{task.vaultName}</span>
                          </>
                        )}
                      </div>
                      {task.assignedToName && (
                        <div className="mt-0.5 text-xs text-text-secondary">
                          {task.assignedToName}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      {countdown && (
                        <span
                          className={`font-mono text-[10px] ${countdown.color}`}
                        >
                          {countdown.text}
                        </span>
                      )}
                      {task.dueAt && (
                        <span className="text-[10px] text-text-muted mt-0.5">
                          {formatDueDate(task.dueAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
