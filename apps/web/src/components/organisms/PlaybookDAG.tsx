"use client";

import { useMemo } from "react";
import DAGNode from "@/components/molecules/DAGNode";
import PlaybookProgress from "@/components/molecules/PlaybookProgress";
import type {
  PlaybookDAGData,
  Chamber,
  DAGNodeData,
  DAGNodeStatus,
} from "@/lib/mock-playbook-dag";
import { computeProgress } from "@/lib/mock-playbook-dag";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PlaybookDAGProps {
  data: PlaybookDAGData;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Chamber ordering & display                                        */
/* ------------------------------------------------------------------ */

const CHAMBER_ORDER: Chamber[] = ["discover", "build", "review", "ship"];

const CHAMBER_LABEL: Record<Chamber, string> = {
  discover: "Discover",
  build: "Build",
  review: "Review",
  ship: "Ship",
};

const CHAMBER_BAR_COLOR: Record<Chamber, string> = {
  discover: "bg-chamber-discover",
  build: "bg-chamber-build",
  review: "bg-chamber-review",
  ship: "bg-chamber-ship",
};

const CHAMBER_BAR_TEXT: Record<Chamber, string> = {
  discover: "text-chamber-discover",
  build: "text-chamber-build",
  review: "text-chamber-review",
  ship: "text-chamber-ship",
};

/* ------------------------------------------------------------------ */
/*  Edge connector line colors                                        */
/* ------------------------------------------------------------------ */

const EDGE_LINE_COLOR: Record<DAGNodeStatus, string> = {
  completed: "bg-accent-success",
  in_progress: "bg-accent-primary",
  blocked: "bg-accent-warning",
  pending: "bg-surface-border",
  skipped: "bg-surface-border",
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PlaybookDAG({
  data,
  onNodeClick,
  className,
}: PlaybookDAGProps) {
  const progress = useMemo(() => computeProgress(data), [data]);

  // Group nodes by chamber, preserving original order within each group
  const grouped = useMemo(() => {
    const map = new Map<Chamber, DAGNodeData[]>();
    for (const chamber of CHAMBER_ORDER) {
      map.set(chamber, []);
    }
    for (const node of data.nodes) {
      map.get(node.chamber)?.push(node);
    }
    return map;
  }, [data.nodes]);

  // Build a lookup for quick source-status resolution
  const nodeStatusMap = useMemo(() => {
    const m = new Map<string, DAGNodeStatus>();
    for (const node of data.nodes) {
      m.set(node.id, node.status);
    }
    return m;
  }, [data.nodes]);

  // Track the flat list of nodes in render order to draw inter-node edges
  const flatNodes = useMemo(() => {
    const result: DAGNodeData[] = [];
    for (const chamber of CHAMBER_ORDER) {
      const nodes = grouped.get(chamber);
      if (nodes) result.push(...nodes);
    }
    return result;
  }, [grouped]);

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {/* Progress summary */}
      <PlaybookProgress
        templateName={data.templateName}
        progress={progress}
        className="rounded-lg border border-surface-border bg-surface-raised px-4 py-3"
      />

      {/* Chamber sections */}
      {CHAMBER_ORDER.map((chamber) => {
        const nodes = grouped.get(chamber);
        if (!nodes || nodes.length === 0) return null;

        return (
          <div key={chamber} className="space-y-0">
            {/* Chamber header bar */}
            <div className="flex items-center gap-2 py-1.5">
              <div
                className={`h-0.5 w-4 rounded-full ${CHAMBER_BAR_COLOR[chamber]}`}
              />
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${CHAMBER_BAR_TEXT[chamber]}`}
              >
                {CHAMBER_LABEL[chamber]}
              </span>
              <div
                className={`h-0.5 flex-1 rounded-full ${CHAMBER_BAR_COLOR[chamber]} opacity-20`}
              />
            </div>

            {/* Nodes with connecting edges */}
            <div className="flex flex-col items-center gap-0">
              {nodes.map((node, idx) => {
                // Determine if we need an edge line ABOVE this node
                const globalIdx = flatNodes.indexOf(node);
                const prevNode =
                  globalIdx > 0 ? flatNodes[globalIdx - 1] : null;
                const showEdge = prevNode !== null;
                const edgeColor = prevNode
                  ? EDGE_LINE_COLOR[nodeStatusMap.get(prevNode.id) ?? "pending"]
                  : "bg-surface-border";

                return (
                  <div key={node.id} className="flex flex-col items-center">
                    {/* Edge connector line */}
                    {showEdge && (
                      <div
                        className={`w-0.5 ${edgeColor}`}
                        style={{ height: idx === 0 ? "12px" : "8px" }}
                      />
                    )}

                    {/* The node itself */}
                    <DAGNode
                      node={node}
                      onClick={
                        onNodeClick ? () => onNodeClick(node.id) : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
