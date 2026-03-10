import { create } from "zustand";
import type {
  PlaybookDAGData,
  DAGNodeData,
  DAGNodeStatus,
} from "@/lib/mock-playbook-dag";
import type { GateResponseState, GateAction } from "@/lib/mock-gates";
import {
  MOCK_DAG_AT_GATE,
  ARCHETYPE_PLAYBOOK_MAP,
} from "@/lib/mock-playbook-dag";
import { MOCK_GATE_RESPONSES } from "@/lib/mock-gates";

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface PlaybookState {
  // Active playbook
  activePlaybook: PlaybookDAGData | null;
  selectedNodeId: string | null;

  // Computed from active playbook
  selectedNode: DAGNodeData | null;
  selectedGate: GateResponseState | null;

  // Actions
  setActivePlaybook: (data: PlaybookDAGData) => void;
  selectNode: (nodeId: string | null) => void;
  handleGateAction: (
    action: GateAction,
    comment?: string,
    optionId?: string,
  ) => void;
  completeNode: (nodeId: string) => void;
  loadDemoPlaybook: (metaArchetype?: string) => void;
  reset: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Deep-clone the playbook so mutations don't affect the original mock */
function clonePlaybook(data: PlaybookDAGData): PlaybookDAGData {
  return {
    ...data,
    nodes: data.nodes.map((n) => ({
      ...n,
      gate: n.gate ? { ...n.gate } : null,
    })),
    edges: data.edges.map((e) => ({ ...e })),
  };
}

/**
 * Advance the first "pending" node after the given nodeId to "in_progress".
 * Walks the DAG edges to find the next downstream node.
 */
function advanceNextNode(nodes: DAGNodeData[], completedNodeId: string): void {
  // Find all nodes that depend on the completed node
  for (const node of nodes) {
    if (
      node.dependsOn.includes(completedNodeId) &&
      (node.status === "pending" || node.status === "blocked")
    ) {
      // Check that ALL dependencies are completed
      const allDepsMet = node.dependsOn.every((depId) => {
        const dep = nodes.find((n) => n.id === depId);
        return dep && dep.status === "completed";
      });

      if (allDepsMet) {
        node.status = "in_progress";
        return;
      }
    }
  }
}

/**
 * Look up the GateResponseState for a node's gate type.
 * Returns a cloned copy so each interaction is independent.
 */
function lookupGateResponse(node: DAGNodeData): GateResponseState | null {
  if (!node.gate) return null;
  const template = MOCK_GATE_RESPONSES[node.gate.type];
  if (!template) return null;
  return {
    ...template,
    nodeId: node.id,
    nodeName: node.name,
    approvals: [...template.approvals],
    options: template.options ? [...template.options] : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const usePlaybookStore = create<PlaybookState>((set, get) => ({
  activePlaybook: null,
  selectedNodeId: null,
  selectedNode: null,
  selectedGate: null,

  setActivePlaybook: (data: PlaybookDAGData) => {
    set({
      activePlaybook: clonePlaybook(data),
      selectedNodeId: null,
      selectedNode: null,
      selectedGate: null,
    });
  },

  selectNode: (nodeId: string | null) => {
    const { activePlaybook } = get();
    if (!nodeId || !activePlaybook) {
      set({ selectedNodeId: null, selectedNode: null, selectedGate: null });
      return;
    }

    const node = activePlaybook.nodes.find((n) => n.id === nodeId) ?? null;
    const gate = node ? lookupGateResponse(node) : null;

    set({
      selectedNodeId: nodeId,
      selectedNode: node,
      selectedGate: gate,
    });
  },

  handleGateAction: (
    action: GateAction,
    comment?: string,
    _optionId?: string,
  ) => {
    const { activePlaybook, selectedNodeId } = get();
    if (!activePlaybook || !selectedNodeId) return;

    const playbook = clonePlaybook(activePlaybook);
    const node = playbook.nodes.find((n) => n.id === selectedNodeId);
    if (!node || !node.gate) return;

    if (action === "approve") {
      // Approve the gate and complete the node
      node.gate.status = "approved";
      node.gate.currentApprovals = node.gate.requiredApprovals;
      node.status = "completed";
      advanceNextNode(playbook.nodes, node.id);
    } else if (action === "reject") {
      // Reject the gate
      node.gate.status = "rejected";
      node.status = "blocked";
    } else if (action === "request_changes") {
      // Send back for rework
      node.gate.status = "pending";
      node.status = "in_progress";
    }

    // Refresh selected node/gate state
    const updatedNode =
      playbook.nodes.find((n) => n.id === selectedNodeId) ?? null;
    const updatedGate = updatedNode ? lookupGateResponse(updatedNode) : null;

    set({
      activePlaybook: playbook,
      selectedNode: updatedNode,
      selectedGate: updatedGate,
    });
  },

  completeNode: (nodeId: string) => {
    const { activePlaybook } = get();
    if (!activePlaybook) return;

    const playbook = clonePlaybook(activePlaybook);
    const node = playbook.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    node.status = "completed";
    if (node.gate) {
      node.gate.status = "approved";
      node.gate.currentApprovals = node.gate.requiredApprovals;
    }
    advanceNextNode(playbook.nodes, nodeId);

    // Refresh selected state if the completed node was selected
    const { selectedNodeId } = get();
    const updatedSelectedNode = selectedNodeId
      ? (playbook.nodes.find((n) => n.id === selectedNodeId) ?? null)
      : null;
    const updatedGate = updatedSelectedNode
      ? lookupGateResponse(updatedSelectedNode)
      : null;

    set({
      activePlaybook: playbook,
      selectedNode: updatedSelectedNode,
      selectedGate: updatedGate,
    });
  },

  loadDemoPlaybook: (metaArchetype?: string) => {
    const template = metaArchetype
      ? ARCHETYPE_PLAYBOOK_MAP[metaArchetype] || MOCK_DAG_AT_GATE
      : MOCK_DAG_AT_GATE;
    const playbook = clonePlaybook(template);
    set({
      activePlaybook: playbook,
      selectedNodeId: null,
      selectedNode: null,
      selectedGate: null,
    });
  },

  reset: () => {
    set({
      activePlaybook: null,
      selectedNodeId: null,
      selectedNode: null,
      selectedGate: null,
    });
  },
}));
