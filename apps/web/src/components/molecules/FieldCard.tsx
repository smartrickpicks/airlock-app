"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import StatusDot from "@/components/atoms/StatusDot";
import ConfidenceBadge from "@/components/atoms/ConfidenceBadge";
import type { ExtractionField } from "@/lib/mock-extractions";

interface FieldCardProps {
  field: ExtractionField;
  heatmapEnabled: boolean;
}

const heatmapBg: Record<string, string> = {
  HIGH: "bg-gate-green/5",
  MED: "bg-gate-amber/5",
  LOW: "bg-gate-red/5",
};

const confidenceBarColor: Record<string, string> = {
  HIGH: "bg-gate-green",
  MED: "bg-gate-amber",
  LOW: "bg-gate-red",
};

export default function FieldCard({ field, heatmapEnabled }: FieldCardProps) {
  const [expanded, setExpanded] = useState(false);

  const bgClass = heatmapEnabled
    ? (heatmapBg[field.confidence_tier] ?? "")
    : "";

  return (
    <div
      className={`rounded-md border border-surface-border ${bgClass || "bg-surface-overlay"} transition-colors duration-fast`}
    >
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
      >
        <StatusDot status={field.status} />
        {expanded ? (
          <ChevronDown size={14} className="flex-shrink-0 text-text-muted" />
        ) : (
          <ChevronRight size={14} className="flex-shrink-0 text-text-muted" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">
          {field.field_name}
        </span>
        <span className="max-w-[200px] truncate text-right font-mono text-xs text-text-secondary">
          {field.extracted_value}
        </span>
        <ConfidenceBadge tier={field.confidence_tier} />
      </button>

      {/* Drawer (expanded) */}
      {expanded && (
        <div className="border-t border-surface-border px-4 py-3">
          {/* Evidence context */}
          {field.evidence_context && (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Evidence
              </p>
              <p
                className="rounded bg-surface-sunken px-2 py-1.5 font-mono text-xs leading-relaxed text-text-secondary"
                dangerouslySetInnerHTML={{ __html: field.evidence_context }}
              />
            </div>
          )}

          {/* Anchor + Extractor row */}
          <div className="mb-3 flex gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Anchor
              </p>
              <p className="font-mono text-xs text-text-secondary">
                {field.anchor_matched || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Extractor
              </p>
              <p className="text-xs capitalize text-text-secondary">
                {field.extractor_type}
              </p>
            </div>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Confidence
              </p>
              <span className="font-mono text-xs text-text-secondary">
                {field.confidence.toFixed(2)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-sunken">
              <div
                className={`h-1.5 rounded-full ${confidenceBarColor[field.confidence_tier]}`}
                style={{ width: `${Math.round(field.confidence * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
