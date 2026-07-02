"use client";

import {
  Check,
  CircleDashed,
  LoaderCircle,
  Lock,
  Slash,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AirlockIcon from "@/components/atoms/AirlockIcon";
import type { AirlockIconName } from "@/components/atoms/airlock-icons/types";
import type {
  DAGNodeData,
  DAGNodeStatus,
  ActorType,
  DAGGateInfo,
} from "@/lib/mock-playbook-dag";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface DAGNodeProps {
  node: DAGNodeData;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Status indicator styles                                           */
/* ------------------------------------------------------------------ */

const STATUS_RING: Record<DAGNodeStatus, string> = {
  completed: "bg-accent-success text-surface-base",
  in_progress: "bg-accent-primary text-surface-base animate-pulse",
  blocked: "bg-accent-warning text-surface-base",
  pending: "border-2 border-text-muted bg-transparent text-text-muted",
  skipped: "bg-text-muted text-surface-base",
};

const STATUS_ICON: Record<DAGNodeStatus, LucideIcon> = {
  completed: Check,
  in_progress: LoaderCircle,
  blocked: Lock,
  pending: CircleDashed,
  skipped: Slash,
};

/* ------------------------------------------------------------------ */
/*  Actor display                                                     */
/* ------------------------------------------------------------------ */

const ACTOR_LUCIDE_ICON: Record<string, LucideIcon> = {
  human: User,
  hybrid: Users,
};

const ACTOR_LABEL: Record<ActorType, string> = {
  otto: "Otto",
  human: "Human",
  hybrid: "Hybrid",
};

/* ------------------------------------------------------------------ */
/*  Gate type icons                                                   */
/* ------------------------------------------------------------------ */

const GATE_ICON_MAP: Record<DAGGateInfo["type"], AirlockIconName> = {
  verification: "gate-verify",
  approval: "gate-approval",
  density: "gate-density",
  decision: "gate-decision",
  convergence: "gate-convergence",
};

/* ------------------------------------------------------------------ */
/*  Chamber dot colors                                                */
/* ------------------------------------------------------------------ */

const CHAMBER_DOT: Record<string, string> = {
  discover: "bg-chamber-discover",
  build: "bg-chamber-build",
  review: "bg-chamber-review",
  ship: "bg-chamber-ship",
};

/* ------------------------------------------------------------------ */
/*  Gate badge                                                        */
/* ------------------------------------------------------------------ */

function GateBadge({ gate }: { gate: DAGGateInfo }) {
  const isApproved = gate.status === "approved";
  const isRejected = gate.status === "rejected";

  const bgColor = isApproved
    ? "bg-accent-success/15 text-accent-success"
    : isRejected
      ? "bg-accent-danger/15 text-accent-danger"
      : "bg-accent-warning/15 text-accent-warning";

  const label = isApproved
    ? `${gate.type} \u2713`
    : isRejected
      ? `${gate.type} \u2717`
      : `${gate.type} ${gate.currentApprovals}/${gate.requiredApprovals}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${bgColor}`}
    >
      <AirlockIcon name={GATE_ICON_MAP[gate.type]} size="sm" />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function DAGNode({
  node,
  isActive = false,
  onClick,
  className,
}: DAGNodeProps) {
  const StatusIcon = STATUS_ICON[node.status];
  const showStatusIcon = node.status !== "pending";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group flex w-full max-w-[280px] items-center gap-3
        rounded-lg border border-surface-border bg-surface-raised
        px-3 py-2.5 text-left
        transition-colors duration-fast
        hover:bg-surface-overlay
        ${isActive ? "ring-1 ring-accent-primary" : ""}
        ${onClick ? "cursor-pointer" : "cursor-default"}
        ${className ?? ""}
      `}
    >
      {/* Left: Status indicator */}
      <div
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${STATUS_RING[node.status]}`}
      >
        {showStatusIcon && <StatusIcon size={12} />}
      </div>

      {/* Center: Node content */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">
          {node.name}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          {node.actor === "otto" ? (
            <AirlockIcon name="otto" size="sm" />
          ) : (
            (() => {
              const LucideActorIcon = ACTOR_LUCIDE_ICON[node.actor];
              return LucideActorIcon ? (
                <LucideActorIcon size={11} className="flex-shrink-0" />
              ) : null;
            })()
          )}
          <span>{ACTOR_LABEL[node.actor]}</span>
          <span className="text-text-muted">({node.archetype})</span>
        </div>
      </div>

      {/* Right: Chamber dot + gate badge */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${CHAMBER_DOT[node.chamber]}`}
          aria-label={`${node.chamber} chamber`}
        />
        {node.gate && <GateBadge gate={node.gate} />}
      </div>
    </button>
  );
}
