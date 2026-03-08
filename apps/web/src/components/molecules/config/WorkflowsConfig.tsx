"use client";

import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

export default function WorkflowsConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  return (
    <div className="space-y-3 p-4">
      <div className="rounded border border-dashed border-surface-border bg-surface-raised/50 p-4 text-center">
        <p className="text-sm font-medium text-text-primary">Coming Soon</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          Workflow builder coming soon. Workflows require Modules and Members to
          be configured.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-surface-border px-4 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave({ ...config, acknowledged: true })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80"
        >
          Save
        </button>
      </div>
    </div>
  );
}
