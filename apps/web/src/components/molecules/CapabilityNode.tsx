"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  Cloud,
  Brain,
  Database,
  Users,
  Lock,
  Cpu,
  Shield,
  Plug,
  Server,
  GitBranch,
  Zap,
  ToggleLeft,
  Radio,
  CheckCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CapabilityNodeData } from "@/lib/mock-capabilities";

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud,
  Brain,
  Database,
  Users,
  Lock,
  Cpu,
  Shield,
  Plug,
  Server,
  GitBranch,
  Zap,
  ToggleLeft,
  Radio,
};

function CapabilityNodeComponent({ data: rawData }: NodeProps) {
  const data = rawData as unknown as CapabilityNodeData;
  const Icon = ICON_MAP[data.icon] || Cloud;
  const isConfigured = data.state === "configured";
  const isLocked = data.state === "locked";

  return (
    <div
      role="button"
      aria-label={`${data.label} — ${data.state}`}
      aria-disabled={isLocked}
      tabIndex={0}
      className={`
        group flex flex-col items-center gap-2 rounded-xl p-3
        transition-all duration-200 ease-out
        cursor-pointer outline-none
        focus:ring-2 focus:ring-accent-primary focus:ring-offset-1 focus:ring-offset-surface-base
        ${isLocked ? "opacity-60" : ""}
      `}
    >
      {/* Target handle (top) — hidden for root node */}
      {data.capabilityId !== "workspace" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-0 !w-0 !border-0 !bg-transparent"
        />
      )}

      {/* Icon circle */}
      <div
        className={`
          relative flex h-20 w-20 items-center justify-center rounded-full
          border-2 transition-all duration-200
          ${
            isConfigured
              ? "border-accent-primary bg-surface-overlay"
              : "border-text-muted/40 bg-surface-overlay"
          }
          group-hover:scale-[1.04]
        `}
        style={
          isConfigured
            ? { boxShadow: "0 0 24px rgba(0, 209, 255, 0.3)" }
            : undefined
        }
      >
        <Icon
          size={32}
          className={isConfigured ? "text-accent-primary" : "text-text-muted"}
        />

        {/* State overlay */}
        {isConfigured && (
          <CheckCircle
            size={18}
            className="absolute -right-1 -top-1 rounded-full bg-surface-base text-accent-success"
          />
        )}
        {isLocked && (
          <Lock
            size={14}
            className="absolute -right-0.5 -top-0.5 rounded-full bg-surface-base p-0.5 text-text-muted"
          />
        )}
      </div>

      {/* Label */}
      <span
        className={`
          text-center text-xs font-medium tracking-wide
          ${isConfigured ? "text-text-primary" : "text-text-muted"}
        `}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {data.label}
      </span>

      {/* Note badge (e.g., OTTO auto-config) */}
      {data.note && (
        <span className="max-w-[200px] text-center text-[10px] italic text-text-muted">
          {data.note}
        </span>
      )}

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-0 !w-0 !border-0 !bg-transparent"
      />
    </div>
  );
}

export default memo(CapabilityNodeComponent);
