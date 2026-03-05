"use client";

import type { CrmDeal } from "@/lib/mock-crm";
import ProgressBar from "@/components/atoms/ProgressBar";

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

      <ProgressBar value={deal.progressPercent} showLabel className="mt-2" />

      {deal.nextTask && (
        <div className="mt-1.5 text-xs text-text-secondary">
          <span className="text-text-muted">Next:</span> {deal.nextTask}
        </div>
      )}
    </div>
  );
}
