"use client";

import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

export default function RolesConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  return (
    <div className="space-y-3 p-4">
      <div className="rounded border border-surface-border bg-surface-raised/50 p-4">
        <p className="text-sm font-medium text-text-primary">
          Chamber-Based Roles
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          Role assignments are managed per-vault in the Members admin panel.
          Airlock uses three chamber-native roles:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-text-secondary">
          <li>
            <span className="font-semibold text-text-primary">Builder</span> —
            drafts and assembles (Discover + Build)
          </li>
          <li>
            <span className="font-semibold text-text-primary">Gatekeeper</span>{" "}
            — reviews and approves (Review)
          </li>
          <li>
            <span className="font-semibold text-text-primary">Owner</span> —
            promotes and publishes (Ship)
          </li>
        </ul>
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
