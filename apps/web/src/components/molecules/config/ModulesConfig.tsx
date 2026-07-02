"use client";

import { useState } from "react";
import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

const MODULES = [
  { key: "contracts", label: "Contracts", icon: "C" },
  { key: "crm", label: "CRM", icon: "R" },
  { key: "tasks", label: "Tasks", icon: "T" },
  { key: "calendar", label: "Calendar", icon: "A" },
  { key: "documents", label: "Documents", icon: "D" },
];

export default function ModulesConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const m of MODULES) {
      initial[m.key] =
        ((config.enabled as Record<string, boolean>) ?? {})[m.key] ?? false;
    }
    return initial;
  });

  const checkedCount = Object.values(enabled).filter(Boolean).length;
  const canSave = checkedCount > 0;

  const toggle = (key: string) => {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-3 p-4">
      <div className="space-y-1">
        {MODULES.map((m) => (
          <label
            key={m.key}
            className="flex cursor-pointer items-center gap-3 rounded border border-surface-border bg-surface-raised/50 px-3 py-2 hover:bg-surface-raised"
          >
            <input
              type="checkbox"
              checked={enabled[m.key]}
              onChange={() => toggle(m.key)}
              className="h-4 w-4 rounded border-surface-border accent-accent-primary"
            />
            <span className="flex h-6 w-6 items-center justify-center rounded bg-surface-border text-[10px] font-bold text-text-secondary">
              {m.icon}
            </span>
            <span className="text-sm text-text-primary">{m.label}</span>
          </label>
        ))}
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
          disabled={!canSave}
          onClick={() => onSave({ enabled })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
