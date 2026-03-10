"use client";

import {
  Shield,
  CheckCircle,
  BarChart3,
  GitBranch,
  Layers,
  User,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Icon from "@/components/atoms/Icon";
import SLATimer from "@/components/molecules/SLATimer";
import type { GateCardData, GateType, GateUrgency } from "@/lib/mock-gates";

interface GateCardProps {
  card: GateCardData;
  onClick?: () => void;
  className?: string;
}

const GATE_TYPE_ICON: Record<GateType, LucideIcon> = {
  verification: Shield,
  approval: CheckCircle,
  density: BarChart3,
  decision: GitBranch,
  convergence: Layers,
};

const URGENCY_BORDER: Record<GateUrgency, string> = {
  green: "border-l-gate-green",
  amber: "border-l-gate-amber",
  red: "border-l-gate-red",
};

const CHAMBER_BADGE_STYLES: Record<string, string> = {
  discover: "bg-chamber-discover/15 text-chamber-discover",
  build: "bg-chamber-build/15 text-chamber-build",
  review: "bg-chamber-review/15 text-chamber-review",
  ship: "bg-chamber-ship/15 text-chamber-ship",
};

export default function GateCard({ card, onClick, className }: GateCardProps) {
  const GateIcon = GATE_TYPE_ICON[card.gateType];
  const progressPercent = Math.min(
    100,
    Math.round((card.currentApprovals / card.requiredApprovals) * 100),
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full cursor-pointer rounded-lg border-l-2 ${URGENCY_BORDER[card.urgency]} border border-l-2 border-surface-border bg-surface-raised px-3 py-3 text-left transition-colors duration-fast hover:bg-surface-overlay ${className ?? ""}`}
    >
      {/* Top row: Gate icon + chamber badge */}
      <div className="mb-2 flex items-center gap-2">
        <Icon icon={GateIcon} size="sm" className="text-text-secondary" />
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CHAMBER_BADGE_STYLES[card.chamber]}`}
        >
          {card.chamber}
        </span>
      </div>

      {/* Vault name */}
      <div className="mb-1 truncate text-sm font-semibold text-text-primary">
        {card.vaultName}
      </div>

      {/* Node name + description */}
      <div className="mb-2 text-xs text-text-muted">
        <span className="font-medium text-text-secondary">{card.nodeName}</span>
        <span className="mx-1">--</span>
        <span className="line-clamp-1">{card.description}</span>
      </div>

      {/* Assignee + SLA */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Icon icon={User} size="sm" className="text-text-muted" />
          <span>{card.assignee}</span>
        </div>
        <SLATimer
          deadline={card.slaDeadline}
          className="scale-75 origin-right"
        />
      </div>

      {/* Approval progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span>Approvals</span>
          <span>
            {card.currentApprovals}/{card.requiredApprovals}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-overlay">
          <div
            className="h-full rounded-full bg-gate-green transition-all duration-normal"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </button>
  );
}
