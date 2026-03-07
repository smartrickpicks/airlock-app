"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import CapabilityNode from "@/components/organisms/CapabilityNode";
import CapabilityEdgeComponent from "@/components/organisms/CapabilityEdge";

export default function CapabilityTree() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    expandNode,
    getProgress,
    getSuggestedStep,
  } = useCapabilityTreeStore();

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      capabilityNode: CapabilityNode,
    }),
    [],
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      capabilityEdge: CapabilityEdgeComponent,
    }),
    [],
  );

  const progress = getProgress();
  const suggestedStep = getSuggestedStep();

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes as unknown as Node[]}
        edges={edges}
        onNodesChange={onNodesChange as unknown as OnNodesChange<Node>}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag
        zoomOnScroll
        className="bg-surface-base"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          color="var(--surface-border-subtle)"
        />
        <Controls className="!rounded-lg !border-surface-border !bg-surface-overlay !shadow-lg [&_button]:!border-surface-border [&_button]:!bg-surface-overlay [&_button]:!text-text-muted [&_button:hover]:!bg-surface-hover" />
        <MiniMap
          nodeColor={() => "var(--color-accent-primary)"}
          maskColor="rgba(0,0,0,0.6)"
          className="!rounded-lg !border-surface-border !bg-surface-sunken"
        />
      </ReactFlow>

      {/* Progress indicator — top right */}
      <div className="absolute right-4 top-4 rounded-lg border border-surface-border bg-surface-overlay/90 p-3 backdrop-blur-sm">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Capabilities
        </p>
        <p className="text-sm font-semibold text-text-primary">
          {progress.configured}/{progress.total} configured
        </p>
        <div className="mt-2 h-1 w-40 rounded-full bg-surface-border">
          <div
            className="h-1 rounded-full bg-accent-primary"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Suggested next step — bottom center */}
      {suggestedStep && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-accent-primary/30 bg-surface-overlay/90 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-medium text-text-muted">
                Next:{" "}
                <span className="text-sm font-medium text-text-primary">
                  {suggestedStep.label}
                </span>
              </p>
              {suggestedStep.description && (
                <p className="mt-0.5 text-xs text-text-secondary">
                  {suggestedStep.description}
                </p>
              )}
            </div>
            <button
              onClick={() => expandNode(suggestedStep.nodeId)}
              className="rounded bg-accent-primary px-3 py-1 text-xs font-semibold text-text-inverse"
            >
              Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
