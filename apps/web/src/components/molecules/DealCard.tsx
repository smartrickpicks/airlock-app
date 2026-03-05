"use client";

import type { CrmDeal } from "@/lib/mock-crm";

interface DealCardProps {
  deal: CrmDeal;
}

export default function DealCard({ deal }: DealCardProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3 cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-colors duration-fast">
      <div className="text-sm font-medium text-text-primary">
        {deal.accountName}
      </div>
      <div className="text-xs text-text-muted">{deal.vaultSlug}</div>

      <div className="mt-2 text-lg font-semibold text-text-primary">
        ${deal.value.toLocaleString()}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-text-secondary">
          {deal.assignedRep || (
            <span className="text-text-muted italic">Unassigned</span>
          )}
        </span>
        <span
          className={
            deal.overdueTaskCount > 0
              ? "text-accent-danger font-medium"
              : "text-text-muted"
          }
        >
          {deal.taskCount} task{deal.taskCount !== 1 ? "s" : ""}
          {deal.overdueTaskCount > 0 && ` (${deal.overdueTaskCount} overdue)`}
        </span>
      </div>

      <div className="mt-1 text-[10px] text-text-muted">
        Stage: {deal.daysInStage}d
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-surface-overlay overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-primary"
            style={{ width: `${deal.progressPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-text-muted">
          {deal.progressPercent}%
        </span>
      </div>

      {deal.nextTask && (
        <div className="mt-1.5 text-xs text-text-secondary">
          <span className="text-text-muted">Next:</span> {deal.nextTask}
        </div>
      )}
    </div>
  );
}
