"use client";

import { ArrowLeft, Save, Play, RotateCcw } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflow.store";
import WorkflowCanvas from "@/components/organisms/WorkflowCanvas";
import { WORKFLOW_STATUS_CONFIG } from "@/lib/mock-workflows";

interface WorkflowBuilderProps {
  onBack: () => void;
}

export default function WorkflowBuilder({ onBack }: WorkflowBuilderProps) {
  const wf = useWorkflowStore((s) => s.selectedWorkflow)();

  if (!wf) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">No workflow selected</p>
      </div>
    );
  }

  const statusCfg = WORKFLOW_STATUS_CONFIG[wf.status];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-surface-border bg-surface-sunken px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {wf.name}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white ${statusCfg.color}`}
              >
                {statusCfg.label}
              </span>
              <span>v{wf.version}</span>
              <span>{wf.nodes.length} nodes</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            title="Test with sample data"
          >
            <Play size={12} />
            Test
          </button>
          <button
            className="flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            title="Undo changes"
          >
            <RotateCcw size={12} />
          </button>
          <button
            className="flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/80"
            title="Commit version"
          >
            <Save size={12} />
            Commit
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas />
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between border-t border-surface-border bg-surface-sunken px-4 py-1.5 text-[10px] text-text-muted">
        <div className="flex items-center gap-4">
          <span>
            Last run: {wf.lastRunAt ? formatTimeAgo(wf.lastRunAt) : "Never"}
          </span>
          <span>{wf.runCount} total runs</span>
          {wf.errorCount > 0 && (
            <span className="text-accent-error">
              {wf.errorCount} error{wf.errorCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span>Auto-saved as draft</span>
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
