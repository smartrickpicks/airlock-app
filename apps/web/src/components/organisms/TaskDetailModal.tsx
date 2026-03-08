"use client";

import { useState } from "react";
import Modal from "@/components/molecules/Modal";
import {
  MODULE_BADGE_CONFIG,
  SEVERITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_TYPE_LABELS,
  type Task,
} from "@/lib/mock-tasks";

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
}: TaskDetailModalProps) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  if (!task) return null;

  const severity = SEVERITY_CONFIG[task.severity];
  const moduleBadge = MODULE_BADGE_CONFIG[task.moduleType];
  const status = TASK_STATUS_CONFIG[task.status];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Detail" size="lg">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              {task.title}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {task.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${moduleBadge.color}`}
            >
              {moduleBadge.label}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${severity.color}`}
            >
              {severity.label}
            </span>
            <span className="rounded-full bg-surface-overlay px-2 py-1 text-[10px] font-semibold text-text-secondary">
              {status.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <MetaItem label="Type" value={TASK_TYPE_LABELS[task.taskType]} />
          <MetaItem
            label="Assigned"
            value={task.assignedToName || "Unassigned"}
          />
          <MetaItem label="Created By" value={task.createdByName} />
          <MetaItem label="Due" value={formatDateTime(task.dueAt)} />
          <MetaItem label="Created" value={formatDateTime(task.createdAt)} />
          <MetaItem label="Updated" value={formatDateTime(task.updatedAt)} />
          <MetaItem label="Source" value={task.source} />
          <MetaItem
            label="Workflow"
            value={task.workflowName || "Manual / direct"}
          />
          <MetaItem
            label="Vault"
            value={task.vaultName || task.vaultSlug || "Workspace"}
          />
          <MetaItem label="Field Code" value={task.fieldCode || "None"} />
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Demo Actions
          </h4>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() =>
                setActionMessage("Task reassignment opened in demo mode.")
              }
              className="rounded-lg bg-accent-primary px-3 py-2 text-xs font-medium text-text-inverse"
            >
              Reassign
            </button>
            <button
              onClick={() =>
                setActionMessage("Note composer opened in demo mode.")
              }
              className="rounded-lg bg-surface-overlay px-3 py-2 text-xs font-medium text-text-secondary"
            >
              Add Note
            </button>
            <button
              onClick={() =>
                setActionMessage("Task moved to review in demo mode.")
              }
              className="rounded-lg bg-surface-overlay px-3 py-2 text-xs font-medium text-text-secondary"
            >
              Mark In Review
            </button>
          </div>
          {actionMessage ? (
            <p className="mt-3 text-xs text-accent-primary">{actionMessage}</p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
