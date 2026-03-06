"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type OnConnect,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "@/stores/workflow.store";
import WorkflowNodeComponent from "@/components/molecules/WorkflowNode";
import WorkflowNodeSidebar from "@/components/molecules/WorkflowNodeSidebar";

export default function WorkflowCanvas() {
  const {
    canvasNodes,
    canvasEdges,
    onNodesChange,
    onEdgesChange,
    setCanvasEdges,
  } = useWorkflowStore();

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      workflowNode: WorkflowNodeComponent,
    }),
    [],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setCanvasEdges(
        addEdge(connection, useWorkflowStore.getState().canvasEdges),
      );
    },
    [setCanvasEdges],
  );

  return (
    <div className="flex h-full">
      {/* Node palette sidebar */}
      <WorkflowNodeSidebar />

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={canvasNodes}
          edges={canvasEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
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
