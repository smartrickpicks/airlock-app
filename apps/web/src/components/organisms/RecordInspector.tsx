"use client";

import { useEffect } from "react";
import { Flame } from "lucide-react";
import { useExtractionStore } from "@/stores/extraction.store";
import SectionGroup from "@/components/organisms/SectionGroup";

interface RecordInspectorProps {
  vaultId: string;
}

export default function RecordInspector({ vaultId }: RecordInspectorProps) {
  const {
    extraction,
    isLoading,
    heatmapEnabled,
    fetchExtraction,
    toggleHeatmap,
  } = useExtractionStore();

  useEffect(() => {
    fetchExtraction(vaultId);
  }, [vaultId, fetchExtraction]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-md bg-surface-overlay"
          />
        ))}
      </div>
    );
  }

  if (!extraction) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">
          No extraction data available for this vault.
        </p>
      </div>
    );
  }

  const totalFields = extraction.sections.reduce(
    (sum, s) => sum + s.fields.length,
    0,
  );

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Record Inspector
          </span>
          <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
            {totalFields} fields
          </span>
        </div>
        <button
          onClick={toggleHeatmap}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
            heatmapEnabled
              ? "bg-gate-amber/20 text-gate-amber"
              : "text-text-muted hover:text-text-secondary"
          }`}
          title="Toggle confidence heatmap"
        >
          <Flame size={14} />
          Heatmap
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-4">
        {extraction.sections.map((section) => (
          <SectionGroup
            key={section.name}
            name={section.name}
            weight={section.weight}
            fields={section.fields}
            heatmapEnabled={heatmapEnabled}
          />
        ))}
      </div>
    </div>
  );
}
