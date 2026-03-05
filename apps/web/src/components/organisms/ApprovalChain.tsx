"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import SLATimer from "@/components/molecules/SLATimer";
import type { ApprovalStep, ApprovalStepStatus } from "@/lib/mock-patches";

const dotStyles: Record<ApprovalStepStatus, string> = {
  completed: "bg-gate-green",
  active: "bg-accent-primary animate-pulse",
  pending: "border-2 border-text-muted bg-transparent",
  rejected: "bg-gate-red",
  returned: "bg-gate-amber",
};

const lineStyles: Record<ApprovalStepStatus, string> = {
  completed: "bg-gate-green",
  active: "bg-accent-primary",
  pending: "bg-surface-border",
  rejected: "bg-gate-red",
  returned: "bg-gate-amber",
};

interface ApprovalChainProps {
  steps: ApprovalStep[];
  className?: string;
}

export default function ApprovalChain({
  steps,
  className,
}: ApprovalChainProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isExpanded = expandedSteps.has(step.id);
        const isExpandable =
          step.status === "completed" || step.status === "returned";

        return (
          <div key={step.id} className="flex gap-3">
            {/* Timeline track */}
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 flex-shrink-0 rounded-full ${dotStyles[step.status]}`}
              />
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 ${lineStyles[step.status]}`}
                  style={{ minHeight: "2rem" }}
                />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <button
                    onClick={() => isExpandable && toggleStep(step.id)}
                    className={`flex items-center gap-1 text-sm font-medium text-text-primary ${isExpandable ? "cursor-pointer hover:text-text-secondary" : "cursor-default"}`}
                    disabled={!isExpandable}
                  >
                    {isExpandable &&
                      (isExpanded ? (
                        <ChevronDown size={12} className="text-text-muted" />
                      ) : (
                        <ChevronRight size={12} className="text-text-muted" />
                      ))}
                    {step.label}
                  </button>
                  <p className="text-xs text-text-muted">
                    {step.actor_name ??
                      (step.role === "system" ? "(system)" : "(unassigned)")}
                    {step.timestamp && (
                      <span className="ml-2 text-text-muted">
                        {new Date(step.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </p>
                </div>
                <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                  {step.role}
                </span>
              </div>

              {step.status === "active" && (
                <div className="mt-2">
                  <SLATimer deadline={step.sla_deadline} />
                </div>
              )}

              {isExpanded && step.note && (
                <div className="mt-2 rounded bg-surface-sunken px-3 py-2">
                  <p className="text-xs text-text-secondary">{step.note}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
