"use client";

import { Activity } from "lucide-react";
import type { QueueStats } from "@/lib/mock-event-bus";
import { QUEUE_STATUS_CONFIG } from "@/lib/mock-event-bus";

interface QueueHealthCardProps {
  stats: QueueStats;
  health: "healthy" | "degraded" | "critical";
  isSelected: boolean;
  onClick: () => void;
}

export default function QueueHealthCard({
  stats,
  health,
  isSelected,
  onClick,
}: QueueHealthCardProps) {
  const healthConfig = QUEUE_STATUS_CONFIG[health];

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${
        isSelected
          ? "border-accent-primary/50 bg-accent-primary/5 ring-1 ring-accent-primary/30"
          : "border-surface-border bg-surface-overlay hover:bg-surface-hover"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${healthConfig.dotColor}`}
          />
          <span className="text-sm font-medium text-text-primary">
            {stats.name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <Activity size={10} />
          <span>
            {stats.active}/{stats.concurrency}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <StatCell label="Pending" value={stats.pending} />
        <StatCell label="Active" value={stats.active} />
        <StatCell
          label="Failed"
          value={stats.failed}
          highlight={stats.failed > 0}
        />
        <StatCell
          label="DLQ"
          value={stats.dlqSize}
          highlight={stats.dlqSize > 0}
        />
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
        <span>Avg: {stats.avgDurationMs}ms</span>
        <span>{stats.completed.toLocaleString()} completed/hr</span>
      </div>
    </button>
  );
}

function StatCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-text-muted">{label}</p>
      <p
        className={`text-sm font-semibold ${
          highlight ? "text-accent-error" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
