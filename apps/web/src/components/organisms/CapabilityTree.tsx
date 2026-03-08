"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ReactFlow, Background, Controls, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCapabilityStore } from "@/stores/capability.store";
import CapabilityNodeComponent from "@/components/molecules/CapabilityNode";
import ProgressBar from "@/components/atoms/ProgressBar";

export default function CapabilityTree() {
  const router = useRouter();
  const {
    nodes,
    edges,
    bannerDismissed,
    init,
    progress,
    nextRecommended,
    dismissBanner,
  } = useCapabilityStore();

  useEffect(() => {
    init();
  }, [init]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({ capabilityNode: CapabilityNodeComponent }),
    [],
  );

  const { configured, total } = progress();
  const { capability: nextCap, unlockText } = nextRecommended();

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { data: Record<string, unknown> }) => {
      const route = node.data.adminRoute as string | null;
      if (!route) return;
      if (node.data.state === "locked") return;
      router.push(route);
    },
    [router],
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "var(--color-text-muted)", strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-surface-base"
      >
        <Background color="rgba(0, 209, 255, 0.04)" gap={40} size={1} />
        <Controls className="!bg-surface-overlay !border-surface-border !rounded-lg !shadow-lg [&_button]:!bg-surface-overlay [&_button]:!border-surface-border [&_button]:!text-text-muted [&_button:hover]:!bg-surface-hover" />
      </ReactFlow>

      {/* ─── HUD: Capabilities Counter (top-right) ───────────── */}
      <div className="pointer-events-none absolute right-4 top-4 flex flex-col gap-3">
        <div className="pointer-events-auto rounded-lg border border-surface-border bg-surface-overlay/90 px-4 py-3 backdrop-blur-sm">
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Capabilities
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">
            {configured}/{total} configured
          </p>
          <ProgressBar
            value={(configured / total) * 100}
            color="primary"
            className="mt-2"
          />
        </div>

        {/* State legend */}
        <div className="pointer-events-auto rounded-lg border border-surface-border bg-surface-overlay/90 px-4 py-3 backdrop-blur-sm">
          <p
            className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent-danger"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            State Definitions
          </p>
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-primary" />
              <span className="text-text-secondary">Configured (Cyan)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-text-muted" />
              <span className="text-text-secondary">Available (Grey-blue)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full border border-text-muted bg-text-muted/40" />
              <span className="text-text-secondary">
                Locked (Grey-blue with lock)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Banner: Next Step ─────────────────────────── */}
      {nextCap && !bannerDismissed && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-overlay/95 px-5 py-3 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary">
                Next:{" "}
                <span className="font-semibold text-text-primary">
                  Configure {nextCap.label}
                </span>
              </span>
              {unlockText && (
                <span className="text-xs text-text-muted">{unlockText}</span>
              )}
            </div>
            {nextCap.adminRoute && (
              <button
                onClick={() => router.push(nextCap.adminRoute!)}
                className="rounded-md bg-accent-primary px-3 py-1 text-xs font-semibold text-text-inverse transition-colors hover:bg-accent-primary-hover cursor-pointer"
              >
                Go
              </button>
            )}
            <button
              onClick={dismissBanner}
              className="text-text-muted transition-colors hover:text-text-primary cursor-pointer"
              aria-label="Dismiss banner"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
