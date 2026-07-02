"use client";

import { useState } from "react";
import type { Task, TaskSeverity } from "@/lib/mock-tasks";
import {
  SEVERITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_TYPE_LABELS,
} from "@/lib/mock-tasks";
import SortHeader from "@/components/molecules/SortHeader";

interface TriageTableProps {
  tasks: Task[];
}

type SortKey =
  | "title"
  | "vaultName"
  | "severity"
  | "status"
  | "assignedToName"
  | "dueAt";
type SortDir = "asc" | "desc";

const SEVERITY_ORDER: Record<TaskSeverity, number> = {
  urgent: 0,
  blocker: 1,
  warning: 2,
  info: 3,
};

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

export default function TriageTable({ tasks }: TriageTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      case "vaultName":
        return (a.vaultName ?? "").localeCompare(b.vaultName ?? "") * dir;
      case "severity":
        return (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) * dir;
      case "status":
        return a.status.localeCompare(b.status) * dir;
      case "assignedToName":
        return (
          (a.assignedToName ?? "").localeCompare(b.assignedToName ?? "") * dir
        );
      case "dueAt": {
        if (!a.dueAt && !b.dueAt) return 0;
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return (
          (new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) * dir
        );
      }
      default:
        return 0;
    }
  });

  return (
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
              label="Vault"
              field="vaultName"
              activeSortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
            <SortHeader
              label="Severity"
              field="severity"
              activeSortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
            <SortHeader
              label="Status"
              field="status"
              activeSortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
            <SortHeader
              label="Assignee"
              field="assignedToName"
              activeSortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
            <SortHeader
              label="Due"
              field="dueAt"
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
                colSpan={6}
                className="px-3 py-12 text-center text-sm text-text-muted"
              >
                No triage items match the current filters
              </td>
            </tr>
          ) : (
            sorted.map((task, idx) => {
              const sev = SEVERITY_CONFIG[task.severity];
              const statusCfg = TASK_STATUS_CONFIG[task.status];
              const due = formatDue(task.dueAt);
              const isSelected = selectedId === task.id;

              return (
                <tr
                  key={task.id}
                  onClick={() => setSelectedId(isSelected ? null : task.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-accent-primary/10"
                      : idx % 2 === 0
                        ? "bg-transparent"
                        : "bg-surface-overlay/30"
                  } hover:bg-surface-overlay/50`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${sev.dotColor}`}
                      />
                      <span className="text-sm text-text-primary">
                        {task.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {task.vaultName || "\u2014"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${sev.color}`}
                    >
                      {sev.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusCfg.color}`}
                      />
                      <span className="text-xs text-text-secondary">
                        {statusCfg.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-secondary">
                    {task.assignedToName || (
                      <span className="italic text-text-muted">\u2014</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {due ? (
                      <span className={`font-mono text-xs ${due.color}`}>
                        {due.text}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">\u2014</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
