"use client";

import { useState } from "react";
import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";
import { MOCK_FEATURE_FLAGS } from "@/lib/mock-admin";

export default function FeatureFlagsConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const ff of MOCK_FEATURE_FLAGS) {
      initial[ff.key] =
        ((config.flags as Record<string, boolean>) ?? {})[ff.key] ??
        ff.status === "enabled";
    }
    return initial;
  });

  const toggle = (key: string) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-3 p-4">
      <div className="space-y-1">
        {MOCK_FEATURE_FLAGS.map((ff) => (
          <div
            key={ff.key}
            className="flex items-center justify-between rounded border border-surface-border bg-surface-raised/50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-text-primary">
                {ff.label}
              </p>
              <p className="truncate text-[10px] text-text-muted">
                {ff.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle(ff.key)}
              className={`relative ml-3 h-5 w-9 shrink-0 rounded-full transition-colors ${
                flags[ff.key] ? "bg-green-500" : "bg-surface-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  flags[ff.key] ? "translate-x-4" : "translate-x-0.5"
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
          onClick={() => onSave({ flags })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80"
        >
          Save
        </button>
      </div>
    </div>
  );
}
