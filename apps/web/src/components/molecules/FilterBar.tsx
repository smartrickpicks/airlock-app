"use client";

import type { SignalType } from "@/lib/mock-review-queue";

type FilterType = SignalType | "all";

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  builderFilter: string | null;
  onBuilderChange: (builder: string | null) => void;
  entityFilter: string | null;
  onEntityChange: (entity: string | null) => void;
  builders: string[];
  entities: string[];
}

const PILLS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "patch", label: "Patches" },
  { value: "rfi", label: "RFIs" },
  { value: "correction", label: "Corrections" },
  { value: "anomaly", label: "Anomalies" },
  { value: "activity", label: "Activity" },
  { value: "escalation", label: "Escalations" },
];

export default function FilterBar({
  activeFilter,
  onFilterChange,
  builderFilter,
  onBuilderChange,
  entityFilter,
  onEntityChange,
  builders,
  entities,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-border bg-surface-raised px-4 py-3">
      <div className="flex flex-wrap gap-1.5">
        {PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => onFilterChange(pill.value)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-fast ${
              activeFilter === pill.value
                ? "bg-accent-primary/15 text-accent-primary border border-accent-primary/30"
                : "bg-surface-overlay text-text-secondary hover:bg-surface-border-subtle border border-transparent"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <label className="text-[10px] uppercase tracking-wider text-text-muted">
          Builder
        </label>
        <select
          value={builderFilter ?? ""}
          onChange={(e) => onBuilderChange(e.target.value || null)}
          className="rounded-md border border-surface-border bg-surface-overlay px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-primary/40"
        >
          <option value="">All</option>
          {builders.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <label className="ml-2 text-[10px] uppercase tracking-wider text-text-muted">
          Entity
        </label>
        <select
          value={entityFilter ?? ""}
          onChange={(e) => onEntityChange(e.target.value || null)}
          className="rounded-md border border-surface-border bg-surface-overlay px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-primary/40"
        >
          <option value="">All</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
