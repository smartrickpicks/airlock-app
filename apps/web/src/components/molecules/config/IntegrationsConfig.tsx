"use client";

import { useState } from "react";
import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

const INTEGRATIONS = [
  { key: "slack", label: "Slack", icon: "S" },
  { key: "docusign", label: "DocuSign", icon: "D" },
  { key: "notion", label: "Notion", icon: "N" },
  { key: "jira", label: "Jira", icon: "J" },
];

export default function IntegrationsConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const [connected, setConnected] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const int of INTEGRATIONS) {
      initial[int.key] =
        ((config.connected as Record<string, boolean>) ?? {})[int.key] ?? false;
    }
    return initial;
  });

  const toggle = (key: string) => {
    setConnected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        {INTEGRATIONS.map((int) => (
          <div
            key={int.key}
            className="flex flex-col items-center gap-2 rounded border border-surface-border bg-surface-raised/50 p-3"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-border text-sm font-bold text-text-secondary">
              {int.icon}
            </span>
            <span className="text-xs font-medium text-text-primary">
              {int.label}
            </span>
            <button
              type="button"
              onClick={() => toggle(int.key)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                connected[int.key] ? "bg-green-500" : "bg-surface-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  connected[int.key] ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
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
          onClick={() => onSave({ connected })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80"
        >
          Save
        </button>
      </div>
    </div>
  );
}
