"use client";

import { useEffect } from "react";
import { Plus, Play, Pause, Pencil } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflow.store";
import {
  WORKFLOW_STATUS_CONFIG,
  TRIGGER_TYPE_LABELS,
  CATEGORY_LABELS,
  type WorkflowCategory,
} from "@/lib/mock-workflows";

interface WorkflowListProps {
  onOpenBuilder: (workflowId: string) => void;
}

export default function WorkflowList({ onOpenBuilder }: WorkflowListProps) {
  const {
    workflows,
    fetchWorkflows,
    categoryFilter,
    setCategoryFilter,
    filteredWorkflows,
  } = useWorkflowStore();

  useEffect(() => {
    if (!workflows || workflows.length === 0) {
      fetchWorkflows();
    }
  }, [workflows, fetchWorkflows]);

  const categories: (WorkflowCategory | "all")[] = [
    "all",
    "lead_qualification",
    "communications",
    "deal_automation",
    "notification",
    "onboarding",
    "custom",
  ];

  const filtered = filteredWorkflows();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Workflows</h2>
          <p className="text-xs text-text-muted">
            Visual automation builder — {workflows?.length ?? 0} workflow
            {(workflows?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/80">
          <Plus size={14} />
          New Workflow
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-1.5 border-b border-surface-border px-6 py-2.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              categoryFilter === cat
                ? "bg-accent-primary/20 text-accent-primary"
                : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
            }`}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <th className="px-6 py-2.5">Name</th>
              <th className="px-4 py-2.5">Trigger</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Runs</th>
              <th className="px-4 py-2.5">Last Run</th>
              <th className="px-4 py-2.5">Version</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((wf) => {
              const statusCfg = WORKFLOW_STATUS_CONFIG[wf.status];
              return (
                <tr
                  key={wf.id}
                  className="border-b border-surface-border transition-colors hover:bg-surface-hover"
                >
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-text-primary">
                      {wf.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {wf.description}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-surface-hover px-2 py-0.5 text-[11px] text-text-secondary">
                      {TRIGGER_TYPE_LABELS[wf.triggerType]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white ${statusCfg.color}`}
                    >
                      {wf.status === "active" ? (
                        <Play size={9} fill="currentColor" />
                      ) : (
                        <Pause size={9} />
                      )}
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-primary">
                      {wf.runCount}
                    </span>
                    {wf.errorCount > 0 && (
                      <span className="ml-1 text-[10px] text-accent-error">
                        ({wf.errorCount} err)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {wf.lastRunAt ? formatTimeAgo(wf.lastRunAt) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    v{wf.version}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onOpenBuilder(wf.id)}
                      className="rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
                      title="Open builder"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">
              No workflows in this category
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
