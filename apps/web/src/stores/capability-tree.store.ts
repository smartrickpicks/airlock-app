import { create } from "zustand";
import type { Edge, NodeChange, EdgeChange } from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges, type Node } from "@xyflow/react";
import {
  CAPABILITY_NODES,
  CAPABILITY_EDGES,
  NODE_POSITIONS,
  DEMO_CONFIGURED_NODES,
  DEMO_CONFIGS,
  SUGGESTION_PRIORITY,
  SUGGESTION_DESCRIPTIONS,
  type CapabilityNodeState,
  type SuggestedStep,
} from "@/lib/mock-capability-tree";

// ─── Types ────────────────────────────────────────────────────────────

export type CapabilityNodeData = {
  nodeId: string;
  label: string;
  tier: "foundation" | "platform" | "extensions" | "scale";
  icon: unknown; // LucideIcon — typed as unknown to avoid cross-package generic issues
  state: CapabilityNodeState;
  config: Record<string, unknown>;
  dependencies: string[];
  isOtto?: boolean;
  description?: string;
  unlockHint?: string;
  children?: string[];
  [key: string]: unknown;
};

interface CapabilityTreeState {
  // React Flow state
  nodes: Node[];
  edges: Edge[];

  // Interaction state
  expandedNodeId: string | null;

  // Persisted config state
  nodeConfigs: Record<string, Record<string, unknown>>;
  nodeStates: Record<string, CapabilityNodeState>;

  // Actions
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  expandNode: (id: string) => void;
  collapseNode: () => void;
  saveNodeConfig: (id: string, config: Record<string, unknown>) => void;
  setNodeError: (id: string) => void;
  initTree: (demoMode?: boolean) => void;

  // Derived
  getProgress: () => { configured: number; total: number; percent: number };
  getSuggestedStep: () => SuggestedStep | null;
}

// ─── localStorage helpers ─────────────────────────────────────────────

const LS_KEY = "airlock_capability_tree";

function loadPersistedState(): {
  configs: Record<string, Record<string, unknown>>;
  states: Record<string, CapabilityNodeState>;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(
  configs: Record<string, Record<string, unknown>>,
  states: Record<string, CapabilityNodeState>,
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ configs, states }));
  } catch {
    // ignore
  }
}

// ─── Dependency Resolution ────────────────────────────────────────────

function resolveState(
  nodeId: string,
  states: Record<string, CapabilityNodeState>,
): CapabilityNodeState {
  const nodeDef = CAPABILITY_NODES.find((n) => n.id === nodeId);
  if (!nodeDef) return "locked";

  // If already configured or in error, keep that state
  // Note: "configuring" is transient UI state — must NOT be preserved here
  const current = states[nodeId];
  if (current === "configured" || current === "error") {
    return current;
  }

  // Root nodes (no dependencies) are always available
  if (nodeDef.dependencies.length === 0) return "available";

  // Check all parent deps are configured
  const allParentsConfigured = nodeDef.dependencies.every(
    (dep) => states[dep] === "configured",
  );
  return allParentsConfigured ? "available" : "locked";
}

function resolveAllStates(
  states: Record<string, CapabilityNodeState>,
): Record<string, CapabilityNodeState> {
  const resolved = { ...states };
  for (const node of CAPABILITY_NODES) {
    if (resolved[node.id] !== "configured" && resolved[node.id] !== "error") {
      resolved[node.id] = resolveState(node.id, resolved);
    }
  }
  return resolved;
}

// ─── Build React Flow nodes/edges from state ──────────────────────────

function buildFlowNodes(
  states: Record<string, CapabilityNodeState>,
  configs: Record<string, Record<string, unknown>>,
  expandedId: string | null,
): Node[] {
  return CAPABILITY_NODES.map((def) => ({
    id: def.id,
    type: "capabilityNode",
    position: NODE_POSITIONS[def.id] ?? { x: 0, y: 0 },
    data: {
      nodeId: def.id,
      label: def.label,
      tier: def.tier,
      icon: def.icon,
      state:
        expandedId === def.id ? "configuring" : (states[def.id] ?? "locked"),
      config: configs[def.id] ?? def.defaultConfig,
      dependencies: def.dependencies,
      isOtto: def.isOtto,
      description: def.description,
      unlockHint: def.unlockHint,
      children: def.children,
    } satisfies CapabilityNodeData,
  }));
}

function buildFlowEdges(states: Record<string, CapabilityNodeState>): Edge[] {
  return CAPABILITY_EDGES.map((edgeDef) => {
    const sourceConfigured = states[edgeDef.source] === "configured";
    return {
      id: `${edgeDef.source}->${edgeDef.target}`,
      source: edgeDef.source,
      target: edgeDef.target,
      type: "capabilityEdge",
      data: { satisfied: sourceConfigured },
      animated: sourceConfigured,
    };
  });
}

// ─── Store ────────────────────────────────────────────────────────────

export const useCapabilityTreeStore = create<CapabilityTreeState>(
  (set, get) => {
    // Load persisted state
    const persisted = loadPersistedState();
    const initialConfigs = persisted?.configs ?? {};
    const rawStates = persisted?.states ?? {};
    const initialStates = resolveAllStates(rawStates);

    return {
      nodes: buildFlowNodes(initialStates, initialConfigs, null),
      edges: buildFlowEdges(initialStates),
      expandedNodeId: null,
      nodeConfigs: initialConfigs,
      nodeStates: initialStates,

      onNodesChange: (changes) => {
        set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
      },

      onEdgesChange: (changes) => {
        set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
      },

      expandNode: (id) => {
        const { expandedNodeId, nodeStates, nodeConfigs } = get();
        const state = nodeStates[id];
        if (state === "locked") return;

        // Revert any previously open node before opening a new one
        const revertedStates = { ...nodeStates };
        if (
          expandedNodeId &&
          expandedNodeId !== id &&
          revertedStates[expandedNodeId] === "configuring"
        ) {
          revertedStates[expandedNodeId] = resolveState(expandedNodeId, {
            ...revertedStates,
            [expandedNodeId]: "available",
          });
        }

        const newStates = { ...revertedStates, [id]: "configuring" as const };
        set({
          expandedNodeId: id,
          nodeStates: newStates,
          nodes: buildFlowNodes(newStates, nodeConfigs, id),
          edges: buildFlowEdges(newStates),
        });
      },

      collapseNode: () => {
        const { expandedNodeId, nodeStates, nodeConfigs } = get();
        if (!expandedNodeId) return;

        // Revert configuring → resolved state
        const revertedStates = { ...nodeStates };
        if (revertedStates[expandedNodeId] === "configuring") {
          revertedStates[expandedNodeId] = resolveState(expandedNodeId, {
            ...revertedStates,
            [expandedNodeId]: "available",
          });
        }
        const resolved = resolveAllStates(revertedStates);

        set({
          expandedNodeId: null,
          nodeStates: resolved,
          nodes: buildFlowNodes(resolved, nodeConfigs, null),
          edges: buildFlowEdges(resolved),
        });
      },

      saveNodeConfig: (id, config) => {
        const { nodeStates, nodeConfigs } = get();
        const newConfigs = { ...nodeConfigs, [id]: config };
        const newStates = { ...nodeStates, [id]: "configured" as const };

        // Re-resolve all states after this node is configured
        const resolved = resolveAllStates(newStates);
        persistState(newConfigs, resolved);

        set({
          expandedNodeId: null,
          nodeConfigs: newConfigs,
          nodeStates: resolved,
          nodes: buildFlowNodes(resolved, newConfigs, null),
          edges: buildFlowEdges(resolved),
        });
      },

      setNodeError: (id) => {
        const { nodeStates, nodeConfigs } = get();
        const newStates = { ...nodeStates, [id]: "error" as const };
        const resolved = resolveAllStates(newStates);
        persistState(nodeConfigs, resolved);

        set({
          expandedNodeId: null,
          nodeStates: resolved,
          nodes: buildFlowNodes(resolved, nodeConfigs, null),
          edges: buildFlowEdges(resolved),
        });
      },

      initTree: (demoMode) => {
        if (demoMode) {
          const demoStates: Record<string, CapabilityNodeState> = {};
          for (const node of CAPABILITY_NODES) {
            demoStates[node.id] = DEMO_CONFIGURED_NODES.includes(node.id)
              ? "configured"
              : "locked";
          }
          const resolved = resolveAllStates(demoStates);
          persistState(DEMO_CONFIGS, resolved);
          set({
            expandedNodeId: null,
            nodeConfigs: DEMO_CONFIGS,
            nodeStates: resolved,
            nodes: buildFlowNodes(resolved, DEMO_CONFIGS, null),
            edges: buildFlowEdges(resolved),
          });
        } else {
          const freshStates: Record<string, CapabilityNodeState> = {};
          for (const node of CAPABILITY_NODES) {
            freshStates[node.id] = "locked";
          }
          const resolved = resolveAllStates(freshStates);
          const freshConfigs: Record<string, Record<string, unknown>> = {};
          persistState(freshConfigs, resolved);
          set({
            expandedNodeId: null,
            nodeConfigs: freshConfigs,
            nodeStates: resolved,
            nodes: buildFlowNodes(resolved, freshConfigs, null),
            edges: buildFlowEdges(resolved),
          });
        }
      },

      getProgress: () => {
        const { nodeStates } = get();
        const total = CAPABILITY_NODES.length;
        const configured = Object.values(nodeStates).filter(
          (s) => s === "configured",
        ).length;
        return {
          configured,
          total,
          percent: total > 0 ? Math.round((configured / total) * 100) : 0,
        };
      },

      getSuggestedStep: () => {
        const { nodeStates } = get();
        for (const nodeId of SUGGESTION_PRIORITY) {
          if (nodeStates[nodeId] === "available") {
            const def = CAPABILITY_NODES.find((n) => n.id === nodeId);
            if (!def) continue;
            return {
              nodeId,
              label: `Configure ${def.label}`,
              description: SUGGESTION_DESCRIPTIONS[nodeId] ?? "",
            };
          }
        }
        return null;
      },
    };
  },
);
