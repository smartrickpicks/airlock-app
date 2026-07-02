"use client";

import { useEffect, useMemo } from "react";
import { ReactFlow, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2 } from "lucide-react";
import WorkflowNodeComponent from "@/components/molecules/WorkflowNode";
import { useAuditTrailStore } from "@/stores/audit-trail.store";
import useAuditTrailLayout from "@/hooks/useAuditTrailLayout";

interface AuditTrailPanelProps {
  vaultId: string;
}

export default function AuditTrailPanel({ vaultId }: AuditTrailPanelProps) {
  const {
    nodes,
    edges,
    isLoading,
    events,
    fetchAuditTrail,
    setFullScreenOpen,
  } = useAuditTrailStore();

  useEffect(() => {
    fetchAuditTrail(vaultId);
  }, [vaultId, fetchAuditTrail]);

  const { layoutNodes, layoutEdges, isLayouting } = useAuditTrailLayout(
    nodes,
    edges,
  );

  const nodeTypes: NodeTypes = useMemo(
    () => ({ workflowNode: WorkflowNodeComponent }),
    [],
  );

  if (isLoading || isLayouting) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-muted border-t-accent-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-text-muted">No audit events for this vault.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setFullScreenOpen(true)}
          className="rounded p-1 text-text-muted transition-colors duration-fast hover:bg-surface-overlay hover:text-text-primary"
          aria-label="Expand audit trail"
        >
          <Maximize2 size={14} />
        </button>
      </div>
      <div className="h-[300px] rounded-lg border border-surface-border bg-surface-base">
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
        />
      </div>
    </div>
  );
}
