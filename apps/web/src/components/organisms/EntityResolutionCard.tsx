"use client";

import { useState } from "react";

interface EntityCheck {
  code: string;
  label: string;
  status: "pass" | "review" | "fail";
  value: string;
  confidence: number;
  vault_id?: string | null;
}

interface EntityResolutionData {
  status: "pass" | "review" | "fail";
  checks: EntityCheck[];
  summary: {
    passed: number;
    review: number;
    failed: number;
  };
}

interface EntityResolutionCardProps {
  data: EntityResolutionData | null;
  requiresManualConfirmation?: boolean;
  newEntryDetected?: boolean;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  pass: "bg-chamber-ship",
  review: "bg-chamber-build",
  fail: "bg-chamber-discover",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  pass: "bg-accent-success",
  review: "bg-accent-warning",
  fail: "bg-accent-danger",
};

const CONFIDENCE_LABEL = (conf: number): { text: string; color: string } => {
  if (conf >= 0.8) return { text: "HIGH", color: "text-accent-success" };
  if (conf >= 0.4) return { text: "MED", color: "text-accent-warning" };
  return { text: "LOW", color: "text-accent-danger" };
};

export default function EntityResolutionCard({
  data,
  requiresManualConfirmation = true,
  newEntryDetected = false,
}: EntityResolutionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-text-muted" />
          <span className="text-sm font-medium text-text-primary">
            Entity Resolution
          </span>
          <span className="ml-auto text-xs text-text-muted">No data</span>
        </div>
      </div>
    );
  }

  const overallStatus = data.status;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-surface-overlay"
      >
        <div
          className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[overallStatus]}`}
        />
        <span className="text-sm font-medium text-text-primary">
          Entity Resolution
        </span>
        {newEntryDetected && (
          <span className="rounded bg-chamber-build/20 px-1.5 py-0.5 text-xs text-chamber-build">
            New Customer
          </span>
        )}
        {requiresManualConfirmation && (
          <span className="rounded bg-accent-warning/20 px-1.5 py-0.5 text-xs text-accent-warning">
            Needs Review
          </span>
        )}
        <span className="ml-auto text-xs text-text-muted">
          {data.summary.passed}/{data.checks.length} resolved
        </span>
        <svg
          className={`h-4 w-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded checks */}
      {expanded && (
        <div className="border-t border-surface-border-subtle px-3 pb-3">
          {data.checks.map((check) => {
            const conf = CONFIDENCE_LABEL(check.confidence);
            return (
              <div
                key={check.code}
                className="flex items-center gap-2 border-b border-surface-border-subtle py-2 last:border-b-0"
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[check.status]}`}
                />
                <span className="w-28 shrink-0 text-xs text-text-secondary">
                  {check.label}
                </span>
                <span className="flex-1 truncate text-xs text-text-primary">
                  {check.value || "\u2014"}
                </span>
                <span className={`font-mono text-xs ${conf.color}`}>
                  {(check.confidence * 100).toFixed(0)}%
                </span>
                <span
                  className={`rounded px-1 py-0.5 text-[10px] font-medium ${STATUS_BADGE_COLORS[check.status]} text-text-inverse`}
                >
                  {conf.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
