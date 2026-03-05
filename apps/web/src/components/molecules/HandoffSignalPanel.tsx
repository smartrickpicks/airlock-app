"use client";

import {
  HelpCircle,
  Pencil,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { HandoffSignal } from "@/lib/mock-review-queue";

interface HandoffSignalPanelProps {
  signal: HandoffSignal;
}

const SIGNAL_CONFIG: Record<
  string,
  { icon: LucideIcon; countColor: string; borderColor: string }
> = {
  rfi: {
    icon: HelpCircle,
    countColor: "text-accent-warning",
    borderColor: "border-accent-warning/20",
  },
  correction: {
    icon: Pencil,
    countColor: "text-accent-secondary",
    borderColor: "border-accent-secondary/20",
  },
  anomaly: {
    icon: AlertTriangle,
    countColor: "text-accent-danger",
    borderColor: "border-accent-danger/20",
  },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HandoffSignalPanel({
  signal,
}: HandoffSignalPanelProps) {
  const config = SIGNAL_CONFIG[signal.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex flex-col rounded-lg border bg-surface-raised p-4 ${config.borderColor}`}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className={config.countColor} />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {signal.label}
        </span>
      </div>
      <span
        className={`mt-2 font-mono text-3xl font-bold ${config.countColor}`}
      >
        {signal.count}
      </span>
      <span className="mt-1 text-xs text-text-muted">{signal.breakdown}</span>
      <div className="mt-3 flex flex-col gap-2">
        {signal.items.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="rounded-md bg-surface-overlay px-3 py-2 cursor-pointer hover:bg-surface-border-subtle transition-colors duration-fast"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary truncate">
                {item.vaultName}
              </span>
              <span className="rounded-full bg-surface-border px-1.5 py-0.5 text-[10px] text-text-muted">
                {item.entityTag}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
              {item.description}
            </p>
            <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted">
              <span>{item.analyst}</span>
              <span>{relativeTime(item.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
      {signal.items.length > 3 && (
        <button className="mt-2 cursor-pointer text-xs text-accent-primary hover:underline self-start">
          View all {signal.count} items
        </button>
      )}
    </div>
  );
}
