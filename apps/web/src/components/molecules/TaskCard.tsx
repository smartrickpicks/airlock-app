"use client";

import type { Task } from "@/lib/mock-tasks";
import {
  SEVERITY_CONFIG,
  MODULE_BADGE_CONFIG,
  TASK_TYPE_LABELS,
} from "@/lib/mock-tasks";

interface TaskCardProps {
  task: Task;
}

function formatDue(
  dueAt: string | null,
): { text: string; color: string } | null {
  if (!dueAt) return null;
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 0)
    return {
      text: `${Math.abs(diffHours)}h overdue`,
      color: "text-accent-danger",
    };
  if (diffHours < 24)
    return { text: `${diffHours}h left`, color: "text-amber-400" };
  const diffDays = Math.round(diffHours / 24);
  return { text: `${diffDays}d left`, color: "text-text-muted" };
}

export default function TaskCard({ task }: TaskCardProps) {
  const severity = SEVERITY_CONFIG[task.severity];
  const moduleBadge = MODULE_BADGE_CONFIG[task.moduleType];
  const due = formatDue(task.dueAt);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3 cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-colors duration-fast">
      {/* Row 1: severity dot + title */}
      <div className="flex items-start gap-2">
        <span
          className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${severity.dotColor}`}
        />
        <span className="text-sm font-medium text-text-primary line-clamp-2">
          {task.title}
        </span>
      </div>

      {/* Row 2: module badge + type */}
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${moduleBadge.color}`}
        >
          {moduleBadge.label}
        </span>
        <span className="text-[10px] text-text-muted">
          {TASK_TYPE_LABELS[task.taskType]}
        </span>
      </div>

      {/* Row 3: vault (if present) */}
      {task.vaultSlug && (
        <div className="mt-1 text-xs text-text-muted">
          {task.vaultName || task.vaultSlug}
        </div>
      )}

      {/* Row 4: assignee + due */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-text-secondary">
          {task.assignedToName || (
            <span className="italic text-text-muted">Unassigned</span>
          )}
        </span>
        {due && (
          <span className={`font-mono text-[10px] ${due.color}`}>
            {due.text}
          </span>
        )}
      </div>
    </div>
  );
}
