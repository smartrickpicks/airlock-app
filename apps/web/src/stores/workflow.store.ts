import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import type {
  Workflow,
  WorkflowRun,
  WorkflowNodeData,
  WorkflowCategory,
} from "@/lib/mock-workflows";
import { MOCK_WORKFLOWS, MOCK_WORKFLOW_RUNS } from "@/lib/mock-workflows";

interface WorkflowState {
  /* data */
  workflows: Workflow[];
  runs: WorkflowRun[];

  /* ui */
  selectedWorkflowId: string | null;
  activeView: "list" | "builder";
  categoryFilter: WorkflowCategory | "all";

  /* canvas state (for the active builder) */
  canvasNodes: Node<WorkflowNodeData>[];
  canvasEdges: Edge[];

  /* actions */
  fetchWorkflows: () => Promise<void>;
  selectWorkflow: (id: string | null) => void;
  setActiveView: (view: WorkflowState["activeView"]) => void;
  setCategoryFilter: (cat: WorkflowState["categoryFilter"]) => void;
  openBuilder: (workflowId: string) => void;

  /* canvas actions */
  setCanvasNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setCanvasEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<Node<WorkflowNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;

  /* derived */
  filteredWorkflows: () => Workflow[];
  selectedWorkflow: () => Workflow | null;
  workflowRuns: (workflowId: string) => WorkflowRun[];
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  runs: [],
  selectedWorkflowId: null,
  activeView: "list",
  categoryFilter: "all",
  canvasNodes: [],
  canvasEdges: [],

  fetchWorkflows: async () => {
    try {
      const res = await fetch("/api/workflows");
      const data = await res.json();
      set({ workflows: data.workflows, runs: data.runs });
    } catch {
      set({ workflows: MOCK_WORKFLOWS, runs: MOCK_WORKFLOW_RUNS });
    }
  },

  selectWorkflow: (id) => set({ selectedWorkflowId: id }),
  setActiveView: (view) => set({ activeView: view }),
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),

  openBuilder: (workflowId) => {
    const wf = get().workflows.find((w) => w.id === workflowId);
    if (wf) {
      set({
        selectedWorkflowId: workflowId,
        activeView: "builder",
        canvasNodes: wf.nodes,
        canvasEdges: wf.edges,
      });
    }
  },

  setCanvasNodes: (nodes) => set({ canvasNodes: nodes }),
  setCanvasEdges: (edges) => set({ canvasEdges: edges }),

  onNodesChange: (changes) => {
    set({ canvasNodes: applyNodeChanges(changes, get().canvasNodes) });
  },

  onEdgesChange: (changes) => {
    set({ canvasEdges: applyEdgeChanges(changes, get().canvasEdges) });
  },

  filteredWorkflows: () => {
    const { workflows, categoryFilter } = get();
    if (categoryFilter === "all") return workflows;
    return workflows.filter((w) => w.category === categoryFilter);
  },

  selectedWorkflow: () => {
    const { workflows, selectedWorkflowId } = get();
    if (!selectedWorkflowId) return null;
    return workflows.find((w) => w.id === selectedWorkflowId) || null;
  },

  workflowRuns: (workflowId) =>
    get().runs.filter((r) => r.workflowId === workflowId),
}));
