"use client";

import { useState } from "react";
import type { Task, TaskSeverity } from "@/lib/mock-tasks";
import {
  SEVERITY_CONFIG,
  MODULE_BADGE_CONFIG,
  TASK_TYPE_LABELS,
} from "@/lib/mock-tasks";
import FilterPills from "@/components/molecules/FilterPills";
import SortHeader from "@/components/molecules/SortHeader";

interface TasksTableProps {
  tasks: Task[];
  title: string;
  subtitle?: string;
  onFilterChange?: (key: string, value: string) => void;
}

type SortKey =
  | "title"
  | "moduleType"
  | "severity"
  | "status"
  | "dueAt"
  | "createdAt";
type SortDir = "asc" | "desc";

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
      color: "text-accent-danger font-medium",
    };
  if (diffHours < 24) return { text: `${diffHours}h`, color: "text-amber-400" };
  const diffDays = Math.round(diffHours / 24);
  return { text: `${diffDays}d`, color: "text-text-muted" };
}

const SEVERITY_ORDER: Record<TaskSeverity, number> = {
  urgent: 0,
  blocker: 1,
  warning: 2,
  info: 3,
};

const QUICK_FILTERS = [
  { label: "All", value: "all" },
  { label: "My Tasks", value: "my_tasks" },
  { label: "Unassigned", value: "unassigned" },
  { label: "Overdue", value: "overdue" },
  { label: "Blockers", value: "blockers" },
];

export default function TasksTable({
  tasks,
  title,
  subtitle,
  onFilterChange,
}: TasksTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeQuickFilter, setActiveQuickFilter] = useState("all");

  const toggleSort = (key: string) => {
    const k = key as SortKey;
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "title":
        return a.title.localeCompare(b.title) * dir;
      case "moduleType":
        return a.moduleType.localeCompare(b.moduleType) * dir;
      case "severity":
        return (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) * dir;
      case "status":
        return a.status.localeCompare(b.status) * dir;
      case "dueAt": {
        if (!a.dueAt && !b.dueAt) return 0;
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return (
          (new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) * dir
        );
      }
      case "createdAt":
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          dir
        );
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <FilterPills
        filters={QUICK_FILTERS}
        activeValue={activeQuickFilter}
        onChange={(v) => {
          setActiveQuickFilter(v);
          onFilterChange?.(v, v);
        }}
      />

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full">
          <thead className="bg-surface-overlay">
            <tr>
              <SortHeader
                label="Title"
                field="title"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortHeader
                label="Module"
                field="moduleType"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Vault
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Type
              </th>
              <SortHeader
                label="Severity"
                field="severity"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Assigned
              </th>
              <SortHeader
                label="Due"
                field="dueAt"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortHeader
                label="Created"
                field="createdAt"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-12 text-center text-sm text-text-muted"
                >
                  No tasks match the current filters
                </td>
              </tr>
            ) : (
              sorted.map((task) => {
                const sev = SEVERITY_CONFIG[task.severity];
                const mod = MODULE_BADGE_CONFIG[task.moduleType];
                const due = formatDue(task.dueAt);

                return (
                  <tr
                    key={task.id}
                    className="transition-colors hover:bg-surface-overlay/50"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 flex-shrink-0 rounded-full ${sev.dotColor}`}
                        />
                        <span className="text-sm text-text-primary">
                          {task.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${mod.color}`}
                      >
                        {mod.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-muted">
                      {task.vaultName || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                      {TASK_TYPE_LABELS[task.taskType]}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${sev.color}`}
                      >
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                      {task.assignedToName || (
                        <span className="italic text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {due ? (
                        <span className={`font-mono text-xs ${due.color}`}>
                          {due.text}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-muted">
                      {formatRelativeDate(task.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
