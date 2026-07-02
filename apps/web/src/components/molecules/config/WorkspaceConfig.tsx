"use client";

import { useState } from "react";
import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

const INDUSTRIES = [
  "Music & Entertainment",
  "Technology",
  "Healthcare",
  "Finance",
  "Legal",
  "Other",
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function WorkspaceConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const [name, setName] = useState((config.name as string) ?? "");
  const [industry, setIndustry] = useState(
    (config.industry as string) ?? "Music & Entertainment",
  );

  const slug = toSlug(name);
  const canSave = name.trim().length > 0;

  return (
    <div className="space-y-3 p-4">
      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-text-secondary">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Workspace"
          className="w-full rounded border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-text-secondary">
          Industry
        </label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full rounded border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-text-secondary">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          readOnly
          className="w-full rounded border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm text-text-muted focus:outline-none"
        />
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
          onClick={() => onSave({ name, industry, slug })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
