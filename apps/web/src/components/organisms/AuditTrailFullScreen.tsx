"use client";

import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X } from "lucide-react";
import WorkflowNodeComponent from "@/components/molecules/WorkflowNode";
import { useAuditTrailStore } from "@/stores/audit-trail.store";
import useAuditTrailLayout from "@/hooks/useAuditTrailLayout";

export default function AuditTrailFullScreen() {
  const { nodes, edges, events, fullScreenOpen, setFullScreenOpen } =
    useAuditTrailStore();

  const { layoutNodes, layoutEdges } = useAuditTrailLayout(nodes, edges);

  const nodeTypes: NodeTypes = useMemo(
    () => ({ workflowNode: WorkflowNodeComponent }),
    [],
  );

  // Escape key closes
  useEffect(() => {
    if (!fullScreenOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullScreenOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fullScreenOpen, setFullScreenOpen]);

  if (!fullScreenOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-surface-base">
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-surface-border bg-surface-raised px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Audit Trail
          </h2>
          <span className="text-xs text-text-muted">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => setFullScreenOpen(false)}
          className="rounded p-1 text-text-muted transition-colors duration-fast hover:bg-surface-overlay hover:text-text-primary"
          aria-label="Close audit trail"
        >
          <X size={18} />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={layoutNodes}
          edges={layoutEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            type: "smoothstep",
            style: { stroke: "var(--color-text-muted)", strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
          className="bg-surface-base"
        >
          <Background color="var(--color-surface-border)" gap={20} size={1} />
          <Controls className="!bg-surface-overlay !border-surface-border !rounded-lg !shadow-lg [&_button]:!bg-surface-overlay [&_button]:!border-surface-border [&_button]:!text-text-muted [&_button:hover]:!bg-surface-hover" />
          <MiniMap
            nodeColor={() => "var(--color-accent-primary)"}
            maskColor="rgba(0,0,0,0.6)"
            className="!bg-surface-sunken !border-surface-border !rounded-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
