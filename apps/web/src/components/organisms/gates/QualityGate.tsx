"use client";

import { useState } from "react";
import { BarChart3, Check, X, Timer, MessageSquare } from "lucide-react";
import Icon from "@/components/atoms/Icon";
import SLATimer from "@/components/molecules/SLATimer";
import type { GateApproval } from "@/lib/mock-gates";

interface QualityGateProps {
  nodeId: string;
  nodeName: string;
  description: string;
  approvals: GateApproval[];
  requiredApprovals: number;
  slaDeadline?: string;
  onAction: (action: "approve" | "request_changes", comment?: string) => void;
  className?: string;
}

export default function QualityGate({
  nodeName,
  description,
  approvals,
  requiredApprovals,
  slaDeadline,
  onAction,
  className,
}: QualityGateProps) {
  const [comment, setComment] = useState("");

  const approvedCount = approvals.filter((a) => a.action === "approve").length;
  const progressPercent =
    requiredApprovals > 0
      ? Math.min(100, Math.round((approvedCount / requiredApprovals) * 100))
      : 0;

  return (
    <div
      className={`rounded-lg border border-surface-border bg-surface-raised ${className ?? ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon icon={BarChart3} size="md" className="text-gate-yellow" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Quality Check
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

        {/* Approval progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Quality approvals</span>
            <span>
              {approvedCount} of {requiredApprovals}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
            <div
              className="h-full rounded-full bg-gate-green transition-all duration-normal"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Previous responses */}
        {approvals.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Responses
            </span>
            {approvals.map((approval) => {
              const isApprove = approval.action === "approve";
              const isRequestChanges = approval.action === "request_changes";
              return (
                <div
                  key={`${approval.responderId}::${approval.respondedAt}`}
                  className="flex items-start gap-3 rounded-md bg-surface-overlay px-3 py-2"
                >
                  <Icon
                    icon={
                      isApprove ? Check : isRequestChanges ? MessageSquare : X
                    }
                    size="sm"
                    className={
                      isApprove
                        ? "text-gate-green"
                        : isRequestChanges
                          ? "text-gate-amber"
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
                          icon={Timer}
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
              );
            })}
          </div>
        )}

        {/* Comment textarea for change requests */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe required changes or add a note..."
          rows={3}
          className="w-full resize-none rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-surface-border px-4 py-3">
        <button
          type="button"
          onClick={() => onAction("request_changes", comment || undefined)}
          className="cursor-pointer rounded border border-gate-amber/30 bg-gate-amber/20 px-4 py-1.5 text-[13px] font-semibold text-gate-amber transition-colors duration-fast hover:bg-gate-amber/30"
        >
          Request Changes
        </button>
        <button
          type="button"
          onClick={() => onAction("approve", comment || undefined)}
          className="cursor-pointer rounded border border-gate-green/30 bg-gate-green/20 px-4 py-1.5 text-[13px] font-semibold text-gate-green transition-colors duration-fast hover:bg-gate-green/30"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
