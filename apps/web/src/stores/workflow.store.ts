import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import type {
  Workflow,
  WorkflowRun,
  WorkflowNodeData,
  WorkflowCategory,
} from "@/lib/mock-workflows";
import { MOCK_WORKFLOWS, MOCK_WORKFLOW_RUNS } from "@/lib/mock-workflows";
import { getWorkspaceMode } from "@/stores/onboarding.store";

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
  createWorkflow: (data: {
    name: string;
    description: string;
    category: WorkflowCategory;
    triggerType: Workflow["triggerType"];
  }) => string;

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
      const data = await apiFetch<{
        workflows: Workflow[];
        runs: WorkflowRun[];
      }>("/api/workflows");
      set({ workflows: data.workflows, runs: data.runs });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ workflows: [], runs: [] });
      } else {
        set({ workflows: MOCK_WORKFLOWS, runs: MOCK_WORKFLOW_RUNS });
      }
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

  createWorkflow: ({ name, description, category, triggerType }) => {
    const id = `wf_demo_${Date.now()}`;
    const triggerMap: Record<
      Workflow["triggerType"],
      {
        label: string;
        nodeType: WorkflowNodeData["nodeType"];
        description: string;
      }
    > = {
      inbound_message: {
        label: "Dedicated Text Received",
        nodeType: "dedicated_text_trigger",
        description: "Dedicated discovery line intake",
      },
      form_submitted: {
        label: "Website Form Submitted",
        nodeType: "website_form_trigger",
        description: "Website discovery form intake",
      },
      meeting_transcript_ready: {
        label: "Meeting Transcript Ready",
        nodeType: "meeting_transcript_trigger",
        description: "Discovery transcript processed",
      },
      stage_change: {
        label: "Lead Stage Changed",
        nodeType: "lead_stage_trigger",
        description: "CRM lifecycle changed",
      },
      follow_up_due: {
        label: "Follow-up Due",
        nodeType: "follow_up_due_trigger",
        description: "Follow-up checkpoint reached",
      },
      no_response_timeout: {
        label: "No Response Timeout",
        nodeType: "no_response_timeout_trigger",
        description: "Wait state expired without reply",
      },
      contract_qualification_reached: {
        label: "Contract Qualification Reached",
        nodeType: "contract_qualification_trigger",
        description: "Qualification confirmed for contract staging",
      },
      task_created: {
        label: "Task Created",
        nodeType: "manual_discovery_trigger",
        description: "Task-based entry point",
      },
      schedule: {
        label: "Scheduled Run",
        nodeType: "follow_up_due_trigger",
        description: "Time-based follow-up checkpoint",
      },
      record_updated: {
        label: "Record Updated",
        nodeType: "lead_stage_trigger",
        description: "Record change trigger",
      },
      webhook: {
        label: "Webhook Received",
        nodeType: "website_form_trigger",
        description: "Webhook-driven intake",
      },
      manual: {
        label: "Manual Discovery Started",
        nodeType: "manual_discovery_trigger",
        description: "Rep-created discovery workflow",
      },
      attachment_received: {
        label: "Attachment Received",
        nodeType: "meeting_transcript_trigger",
        description: "Artifact processing trigger",
      },
      threshold_crossed: {
        label: "Threshold Crossed",
        nodeType: "lead_stage_trigger",
        description: "Threshold-based lifecycle change",
      },
    };
    const triggerConfig = triggerMap[triggerType];
    const workflow: Workflow = {
      id,
      workspaceId: "ws_demo",
      name,
      description,
      category,
      status: "draft",
      triggerType,
      version: 1,
      publishedAt: null,
      lastRunAt: null,
      runCount: 0,
      errorCount: 0,
      nodes: [
        {
          id: `${id}_trigger`,
          type: "workflowNode",
          position: { x: 250, y: 0 },
          data: {
            label: triggerConfig.label,
            nodeType: triggerConfig.nodeType,
            category: "trigger",
            description: triggerConfig.description,
          },
        },
        {
          id: `${id}_action`,
          type: "workflowNode",
          position: { x: 250, y: 140 },
          data: {
            label: "Create Tasks",
            nodeType: "create_task_bundle",
            category: "action",
            description: "Demo discovery follow-up action",
          },
        },
      ],
      edges: [
        {
          id: `${id}_edge_1`,
          source: `${id}_trigger`,
          target: `${id}_action`,
        },
      ],
      createdBy: "user_demo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      workflows: [workflow, ...state.workflows],
      selectedWorkflowId: id,
      activeView: "builder",
      canvasNodes: workflow.nodes,
      canvasEdges: workflow.edges,
    }));

    return id;
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
