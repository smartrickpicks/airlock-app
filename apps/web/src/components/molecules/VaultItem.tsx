"use client";

import GateDot from "@/components/atoms/GateDot";
import Badge from "@/components/atoms/Badge";

type Gate = "discover" | "build" | "review" | "ship";

interface VaultItemProps {
  name: string;
  entity: string;
  contractType: string;
  gate: Gate;
  healthPercent: number;
  unreadCount?: number;
  isActive: boolean;
  onClick: () => void;
}

function getHealthColor(percent: number): string {
  if (percent >= 80) return "text-gate-green";
  if (percent >= 50) return "text-gate-yellow";
  return "text-gate-red";
}

export default function VaultItem({
  name,
  entity,
  contractType,
  gate,
  healthPercent,
  unreadCount = 0,
  isActive,
  onClick,
}: VaultItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full mx-2 h-11 py-1.5 px-3
        flex flex-col justify-center
        rounded cursor-pointer
        transition-colors duration-fast
        ${
          isActive
            ? "bg-surface-overlay border-l-2 border-accent-primary"
            : "bg-transparent hover:bg-surface-overlay"
        }
      `}
      aria-current={isActive ? "true" : undefined}
    >
      {/* Line 1: GateDot + Name + Health % */}
      <div className="flex items-center gap-1.5 w-full min-w-0">
        <GateDot gate={gate} />
        <span className="text-[13px] text-text-primary truncate flex-1 text-left">
          {name}
        </span>
        <span
          className={`
            font-mono text-[11px] flex-shrink-0
            ${getHealthColor(healthPercent)}
          `}
        >
          {healthPercent}%
        </span>
      </div>

      {/* Line 2: Entity + Contract Type + Unread Badge */}
      <div className="flex items-center w-full min-w-0">
        <span className="text-xs text-text-muted truncate flex-1 text-left">
          {entity} &mdash; {contractType}
        </span>
        {unreadCount > 0 && (
          <span className="flex-shrink-0 ml-1.5">
            <Badge count={unreadCount} />
          </span>
        )}
      </div>
    </button>
  );
}
