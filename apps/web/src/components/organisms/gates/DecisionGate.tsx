"use client";

import { useState } from "react";
import { GitBranch, Sparkle } from "lucide-react";
import Icon from "@/components/atoms/Icon";
import SLATimer from "@/components/molecules/SLATimer";
import type { DecisionOption } from "@/lib/mock-gates";

interface DecisionGateProps {
  nodeId: string;
  nodeName: string;
  description: string;
  options: DecisionOption[];
  slaDeadline?: string;
  onAction: (action: "approve", comment?: string, optionId?: string) => void;
  className?: string;
}

export default function DecisionGate({
  nodeName,
  description,
  options,
  slaDeadline,
  onAction,
  className,
}: DecisionGateProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div
      className={`rounded-lg border border-surface-border bg-surface-raised ${className ?? ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon icon={GitBranch} size="md" className="text-accent-secondary" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Decision Required
          </span>
        </div>
        {slaDeadline && <SLATimer deadline={slaDeadline} />}
      </div>

      {/* Body */}
      <div className="space-y-4 px-4 py-4">
        {/* Description */}
        <p className="text-sm leading-relaxed text-text-secondary">
          {description}
        </p>

        {/* Option cards */}
        <div className="grid gap-3">
          {options.map((option) => {
            const isSelected = selectedId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedId(option.id)}
                className={`relative w-full cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors duration-fast ${
                  isSelected
                    ? "border-accent-primary bg-accent-primary/10"
                    : "border-surface-border bg-surface-overlay hover:border-text-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {option.label}
                      </span>
                      {option.recommended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gate-green/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gate-green">
                          <Icon
                            icon={Sparkle}
                            size="sm"
                            className="text-gate-green"
                          />
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      {option.description}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-fast ${
                      isSelected
                        ? "border-accent-primary bg-accent-primary"
                        : "border-text-muted"
                    }`}
                  >
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-text-inverse" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end border-t border-surface-border px-4 py-3">
        <button
          type="button"
          onClick={() => {
            if (selectedId) {
              onAction("approve", undefined, selectedId);
            }
          }}
          disabled={!selectedId}
          className={`cursor-pointer rounded border px-4 py-1.5 text-[13px] font-semibold transition-colors duration-fast ${
            selectedId
              ? "border-gate-green/30 bg-gate-green/20 text-gate-green hover:bg-gate-green/30"
              : "cursor-not-allowed border-surface-border bg-surface-overlay text-text-muted opacity-40"
          }`}
        >
          Confirm Selection
        </button>
      </div>
    </div>
  );
}
