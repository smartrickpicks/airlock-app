"use client";

import { Layers, Check, X, Clock } from "lucide-react";
import Icon from "@/components/atoms/Icon";
import SLATimer from "@/components/molecules/SLATimer";
import type { GateApproval } from "@/lib/mock-gates";

interface ConvergenceGateProps {
  nodeId: string;
  nodeName: string;
  description: string;
  summary: string;
  approvals: GateApproval[];
  requiredApprovals: number;
  slaDeadline?: string;
  onAction: (action: "approve", comment?: string) => void;
  className?: string;
}

export default function ConvergenceGate({
  nodeName,
  description,
  summary,
  approvals,
  requiredApprovals,
  slaDeadline,
  onAction,
  className,
}: ConvergenceGateProps) {
  const approvedCount = approvals.filter((a) => a.action === "approve").length;

  return (
    <div
      className={`rounded-lg border border-surface-border bg-surface-raised ${className ?? ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon icon={Layers} size="md" className="text-gate-green" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Review Summary
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

        {/* Summary card */}
        <div className="rounded-lg border border-surface-border bg-surface-overlay p-4">
          <div className="mb-2 flex items-center gap-2">
            <Icon icon={Layers} size="sm" className="text-accent-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Aggregated Summary
            </span>
          </div>
          <p className="text-sm leading-relaxed text-text-primary">{summary}</p>
        </div>

        {/* Approval list */}
        {approvals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Sign-offs
              </span>
              <span className="text-xs text-text-muted">
                {approvedCount} of {requiredApprovals}
              </span>
            </div>
            {approvals.map((approval) => (
              <div
                key={approval.responderId + approval.respondedAt}
                className="flex items-start gap-3 rounded-md bg-surface-overlay px-3 py-2"
              >
                <Icon
                  icon={approval.action === "approve" ? Check : X}
                  size="sm"
                  className={
                    approval.action === "approve"
                      ? "text-gate-green"
                      : "text-gate-red"
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {approval.responderName}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Icon
                        icon={Clock}
                        size="sm"
                        className="text-text-muted"
                      />
                      {new Date(approval.respondedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {approval.comment && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {approval.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end border-t border-surface-border px-4 py-3">
        <button
          onClick={() => onAction("approve")}
          className="cursor-pointer rounded border border-gate-green/30 bg-gate-green/20 px-4 py-1.5 text-[13px] font-semibold text-gate-green transition-colors duration-fast hover:bg-gate-green/30"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
