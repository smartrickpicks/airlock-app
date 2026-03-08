"use client";

import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

export default function OttoConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const aiConnected = (config.aiConnected as boolean) ?? false;
  const toolCount = (config.toolCount as number) ?? 12;

  return (
    <div className="space-y-3 p-4">
      <div className="rounded border border-surface-border bg-surface-raised/50 p-4">
        <p className="text-sm font-medium text-text-primary">OTTO AI Agent</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          OTTO is auto-configured when AI Provider is connected. No additional
          setup is required.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded border border-surface-border bg-surface-raised/50 px-3 py-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${aiConnected ? "bg-green-500" : "bg-yellow-500"}`}
        />
        <div className="flex-1">
          <p className="text-xs font-medium text-text-primary">
            {aiConnected ? "Ready" : "Waiting for AI Provider"}
          </p>
          <p className="text-[10px] text-text-muted">
            {toolCount} tools available
          </p>
        </div>
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
