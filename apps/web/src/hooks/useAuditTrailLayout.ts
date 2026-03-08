"use client";

import { useEffect, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import type { WorkflowNodeData } from "@/lib/mock-workflows";

const elk = new ELK();

const NODE_WIDTH = 180;
const NODE_HEIGHT = 52;

interface LayoutResult {
  layoutNodes: Node<WorkflowNodeData>[];
  layoutEdges: Edge[];
  isLayouting: boolean;
}

export default function useAuditTrailLayout(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
): LayoutResult {
  const [layoutNodes, setLayoutNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<Edge[]>(edges);
  const [isLayouting, setIsLayouting] = useState(false);

  useEffect(() => {
    if (nodes.length === 0) {
      setLayoutNodes([]);
      setLayoutEdges([]);
      return;
    }

    setIsLayouting(true);

    const graph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.spacing.nodeNode": "60",
        "elk.layered.spacing.nodeNodeBetweenLayers": "80",
        "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      },
      children: nodes.map((node) => ({
        id: node.id,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    elk
      .layout(graph)
      .then((layoutGraph) => {
        const positioned = nodes.map((node) => {
          const elkNode = layoutGraph.children?.find((n) => n.id === node.id);
          return {
            ...node,
            position: {
              x: elkNode?.x ?? 0,
              y: elkNode?.y ?? 0,
            },
          };
        });
        setLayoutNodes(positioned);
        setLayoutEdges(edges);
        setIsLayouting(false);
      })
      .catch(() => {
        // Fallback: vertical stack
        const positioned = nodes.map((node, i) => ({
          ...node,
          position: { x: 0, y: i * 100 },
        }));
        setLayoutNodes(positioned);
        setLayoutEdges(edges);
        setIsLayouting(false);
      });
  }, [nodes, edges]);

  return { layoutNodes, layoutEdges, isLayouting };
}
