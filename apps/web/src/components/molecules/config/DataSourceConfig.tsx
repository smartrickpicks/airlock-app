"use client";

import { useState } from "react";
import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

const SOURCE_TYPES = ["Google Drive", "File Upload", "API", "Demo Data"];

export default function DataSourceConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const [sourceType, setSourceType] = useState(
    (config.sourceType as string) ?? "",
  );
  const [loadDemoData, setLoadDemoData] = useState(
    (config.loadDemoData as boolean) ?? false,
  );

  const canSave = sourceType.length > 0;

  const handleSourceChange = (value: string) => {
    setSourceType(value);
    if (value === "Demo Data") {
      setLoadDemoData(true);
    }
  };

  return (
    <div className="space-y-3 p-4">
      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-text-secondary">
          Source Type
        </label>
        <select
          value={sourceType}
          onChange={(e) => handleSourceChange(e.target.value)}
          className="w-full rounded border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="">Select a source...</option>
          {SOURCE_TYPES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 rounded border border-surface-border bg-surface-raised/50 px-3 py-2">
        <input
          type="checkbox"
          checked={loadDemoData}
          onChange={(e) => setLoadDemoData(e.target.checked)}
          className="h-4 w-4 rounded border-surface-border accent-accent-primary"
        />
        <span className="text-xs text-text-secondary">Load demo data</span>
      </label>

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
          onClick={() => onSave({ sourceType, loadDemoData })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
