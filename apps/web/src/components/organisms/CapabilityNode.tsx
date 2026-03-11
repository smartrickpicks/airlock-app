"use client";

import { memo, lazy, Suspense, useState, useRef, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { Lock, X, Check, AlertTriangle } from "lucide-react";
import Skeleton from "@/components/atoms/Skeleton";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import type { CapabilityNodeData } from "@/stores/capability-tree.store";

// Lazy-load NodeConfigPanel
const NodeConfigPanel = lazy(() =>
  import("@/components/molecules/NodeConfigPanel").catch(() => ({
    default: ({
      nodeId,
    }: {
      nodeId: string;
      config: Record<string, unknown>;
    }) => (
      <div className="flex h-24 items-center justify-center text-sm text-text-muted">
        Configuration — {nodeId}
      </div>
    ),
  })),
);

// ─── Handle Styles ───────────────────────────────────────────────────

const HANDLE_BASE = "!h-2 !w-2 !border-2 !border-surface-base";
const HANDLE_DEFAULT = `${HANDLE_BASE} !bg-text-muted`;
const HANDLE_CONFIGURED = `${HANDLE_BASE} !bg-accent-primary`;

// ─── Tooltip ─────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute -bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-surface-overlay px-2 py-1 text-[10px] text-text-muted shadow-lg">
      {text}
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────

function CheckBadge() {
  return (
    <div className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent-success">
      <Check size={10} className="text-white" strokeWidth={3} />
    </div>
  );
}

function ErrorBadge() {
  return (
    <div className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent-danger">
      <AlertTriangle size={10} className="text-white" strokeWidth={3} />
    </div>
  );
}

function LockOverlay() {
  return (
    <div className="absolute -bottom-0.5 -right-0.5">
      <Lock size={14} className="text-text-muted" />
    </div>
  );
}

// ─── Circle Node (all visual states) ─────────────────────────────────

function CircleNode({
  data,
  isConfiguring,
}: {
  data: CapabilityNodeData;
  isConfiguring: boolean;
}) {
  const expandNode = useCapabilityTreeStore((s) => s.expandNode);
  const [showTooltip, setShowTooltip] = useState(false);

  const Icon = data.icon as React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  const isOtto = data.isOtto;
  const size = isOtto ? "w-[100px] h-[100px]" : "w-20 h-20";

  // Use the visual state (configured/available/etc.) even when configuring
  const visualState = isConfiguring ? "configuring" : data.state;

  const stateStyles: Record<string, string> = {
    locked: `${size} rounded-full bg-surface-raised/30 border border-dashed border-surface-border opacity-50 cursor-not-allowed`,
    available: `${size} rounded-full bg-surface-raised border border-surface-border cursor-pointer hover:border-accent-primary hover:shadow-[0_0_0_3px_rgba(0,209,255,0.2)] transition-all duration-[250ms]`,
    configuring: `${size} rounded-full bg-surface-raised border-2 border-accent-primary cursor-pointer shadow-[0_0_16px_rgba(0,209,255,0.35)] transition-all duration-[250ms]`,
    configured: isOtto
      ? `${size} rounded-full bg-surface-raised border border-[#6366F1] cursor-pointer shadow-[0_0_16px_rgba(99,102,241,0.3)]`
      : `${size} rounded-full bg-surface-raised border border-accent-primary cursor-pointer shadow-[0_0_12px_rgba(0,209,255,0.25)]`,
    error: `${size} rounded-full bg-surface-raised border border-accent-danger cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.2)]`,
  };

  const iconStyles: Record<string, string> = {
    locked: "text-text-muted",
    available: "text-text-secondary",
    configuring: "text-accent-primary",
    configured: isOtto ? "text-[#6366F1]" : "text-accent-primary",
    error: "text-accent-danger",
  };

  const handleClick = () => {
    if (data.state === "locked") return;
    expandNode(data.nodeId);
  };

  return (
    <div
      className="relative flex flex-col items-center gap-1.5"
      onMouseEnter={() => data.state === "locked" && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`relative flex items-center justify-center ${stateStyles[visualState] ?? stateStyles.locked}`}
        onClick={handleClick}
      >
        <Icon
          size={isOtto ? 32 : 24}
          className={iconStyles[visualState] ?? iconStyles.locked}
        />

        {data.state === "configured" && !isConfiguring && <CheckBadge />}
        {data.state === "error" && !isConfiguring && <ErrorBadge />}
        {data.state === "locked" && <LockOverlay />}
      </div>

      <span
        className={`font-mono text-[11px] ${visualState === "locked" ? "text-text-muted" : "text-text-primary"}`}
      >
        {data.label}
      </span>

      {isOtto && data.description && (
        <span className="font-mono text-[9px] text-text-muted">
          {data.description}
        </span>
      )}

      {showTooltip && data.unlockHint && <Tooltip text={data.unlockHint} />}
    </div>
  );
}

// ─── Draggable Config Panel (floating, offset from node) ─────────────

function DraggableConfigPanel({ data }: { data: CapabilityNodeData }) {
  const collapseNode = useCapabilityTreeStore((s) => s.collapseNode);
  const Icon = data.icon as React.ComponentType<{
    size?: number;
    className?: string;
  }>;

  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [position, setPosition] = useState({ x: 100, y: -20 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag from header area
      e.stopPropagation();
      e.preventDefault();
      dragState.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: position.x,
        offsetY: position.y,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragState.current.isDragging) return;
        const dx = ev.clientX - dragState.current.startX;
        const dy = ev.clientY - dragState.current.startY;
        setPosition({
          x: dragState.current.offsetX + dx,
          y: dragState.current.offsetY + dy,
        });
      };

      const handleMouseUp = () => {
        dragState.current.isDragging = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [position.x, position.y],
  );

  return (
    <div
      ref={panelRef}
      className="absolute z-50 w-80 min-h-[200px] rounded-xl bg-surface-overlay border border-accent-primary shadow-[0_0_20px_rgba(0,209,255,0.15),0_4px_24px_rgba(0,0,0,0.5)]"
      style={{ left: position.x, top: position.y }}
    >
      {/* Draggable header */}
      <div
        className="flex cursor-grab items-center justify-between px-4 py-3 active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-accent-primary" />
          <span className="select-none font-mono text-sm font-semibold text-text-primary">
            {data.label}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            collapseNode();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </div>

      {/* Connector line hint */}
      <div className="absolute -left-6 top-5 h-px w-6 bg-accent-primary/40" />

      {/* Divider */}
      <div className="h-px w-full bg-surface-border" />

      {/* Config Body — stopPropagation prevents React Flow from re-selecting node */}
      <div
        className="nowheel nodrag nopan"
        onClick={(e) => e.stopPropagation()}
      >
        <Suspense
          fallback={
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          }
        >
          <NodeConfigPanel nodeId={data.nodeId} config={data.config} />
        </Suspense>
      </div>
    </div>
  );
}

// ─── Main CapabilityNode Component ──────────────────────────────────

type CapabilityNodeType = Node<CapabilityNodeData & Record<string, unknown>>;

function CapabilityNodeComponent({ data }: NodeProps<CapabilityNodeType>) {
  const isConfiguring = data.state === "configuring";
  const isConfigured = data.state === "configured";
  const hasDependencies = data.dependencies.length > 0;

  return (
    <>
      {/* Input handle */}
      {hasDependencies && (
        <Handle
          type="target"
          position={Position.Top}
          className={isConfigured ? HANDLE_CONFIGURED : HANDLE_DEFAULT}
        />
      )}

      {/* Always show the circle node */}
      <CircleNode data={data} isConfiguring={isConfiguring} />

      {/* Floating draggable config panel when configuring */}
      {isConfiguring && <DraggableConfigPanel data={data} />}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={isConfigured ? HANDLE_CONFIGURED : HANDLE_DEFAULT}
      />
    </>
  );
}

export default memo(CapabilityNodeComponent);
