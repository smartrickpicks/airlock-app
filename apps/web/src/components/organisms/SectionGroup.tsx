"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import FieldCard from "@/components/molecules/FieldCard";
import type { ExtractionField, FieldStatus } from "@/lib/mock-extractions";

interface SectionGroupProps {
  name: string;
  weight: number;
  fields: ExtractionField[];
  heatmapEnabled: boolean;
}

function statusCount(fields: ExtractionField[], status: FieldStatus): number {
  return fields.filter((f) => f.status === status).length;
}

export default function SectionGroup({
  name,
  weight,
  fields,
  heatmapEnabled,
}: SectionGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showTier2, setShowTier2] = useState(false);

  const tier1 = fields.filter((f) => f.tier === 1);
  const tier2 = fields.filter((f) => f.tier === 2);

  const passCount = statusCount(fields, "pass");
  const reviewCount = statusCount(fields, "review");
  const failCount = statusCount(fields, "fail");
  const missingCount = statusCount(fields, "missing");

  return (
    <div className="mb-4">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-surface-overlay"
      >
        {collapsed ? (
          <ChevronRight size={16} className="text-text-muted" />
        ) : (
          <ChevronDown size={16} className="text-text-muted" />
        )}
        <span className="text-sm font-semibold text-text-primary">{name}</span>
        <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          {Math.round(weight * 100)}%
        </span>
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          {passCount > 0 && (
            <span className="text-gate-green">{passCount} pass</span>
          )}
          {reviewCount > 0 && (
            <span className="text-gate-amber">{reviewCount} review</span>
          )}
          {failCount > 0 && (
            <span className="text-gate-red">{failCount} fail</span>
          )}
          {missingCount > 0 && (
            <span className="text-text-muted">{missingCount} missing</span>
          )}
        </div>
      </button>

      {/* Field cards */}
      {!collapsed && (
        <div className="mt-1 flex flex-col gap-1.5 pl-2">
          {tier1.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              heatmapEnabled={heatmapEnabled}
            />
          ))}

          {tier2.length > 0 && !showTier2 && (
            <button
              onClick={() => setShowTier2(true)}
              className="cursor-pointer rounded-md border border-dashed border-surface-border px-3 py-1.5 text-center text-xs text-text-muted transition-colors hover:border-accent-primary/30 hover:text-text-secondary"
            >
              {tier2.length} more field{tier2.length !== 1 ? "s" : ""}
            </button>
          )}

          {showTier2 &&
            tier2.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                heatmapEnabled={heatmapEnabled}
              />
            ))}
        </div>
      )}
    </div>
  );
}
