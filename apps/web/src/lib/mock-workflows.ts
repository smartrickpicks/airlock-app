/**
 * Mock Workflow Engine data
 * Visual automation builder — lives in Admin overlay
 */

import type { Node, Edge } from "@xyflow/react";

/* ── Types ────────────────────────────────────────────── */

export type WorkflowStatus = "draft" | "active" | "inactive" | "archived";

export type WorkflowCategory =
  | "lead_qualification"
  | "communications"
  | "deal_automation"
  | "notification"
  | "onboarding"
  | "contract"
  | "custom";

export type TriggerType =
  | "inbound_message"
  | "form_submitted"
  | "stage_change"
  | "task_created"
  | "schedule"
  | "record_updated"
  | "webhook"
  | "manual"
  | "attachment_received"
  | "threshold_crossed";

export type NodeCategory = "trigger" | "function" | "action";

export type WorkflowNodeType =
  | "trigger"
  | "branch"
  | "delay"
  | "batch"
  | "throttle"
  | "fetch"
  | "ai_classify"
  | "ai_generate"
  | "transform"
  | "loop"
  | "experiment"
  | "send_message"
  | "create_task"
  | "create_vault"
  | "update_record"
  | "assign"
  | "notify"
  | "route_to_pool"
  | "start_workflow"
  | "set_sla"
  | "log_event"
  | "conversational_ask";

export type RunStatus =
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkflowNodeData {
  label: string;
  nodeType: WorkflowNodeType;
  category: NodeCategory;
  description?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  status: WorkflowStatus;
  triggerType: TriggerType;
  version: number;
  publishedAt: string | null;
  lastRunAt: string | null;
  runCount: number;
  errorCount: number;
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: RunStatus;
  triggerData: Record<string, unknown>;
  contactName: string | null;
  vaultName: string | null;
  nodesVisited: number;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

/* ── Node palette config ──────────────────────────────── */

export interface NodePaletteItem {
  type: WorkflowNodeType;
  label: string;
  icon: string;
  category: NodeCategory;
  description: string;
}

export const NODE_PALETTE: NodePaletteItem[] = [
  // Triggers
  {
    type: "trigger",
    label: "Trigger",
    icon: "Zap",
    category: "trigger",
    description: "Entry point — defines what event starts this workflow",
  },
  // Functions
  {
    type: "branch",
    label: "Branch",
    icon: "GitBranch",
    category: "function",
    description: "If/else conditional routing (up to 10 paths)",
  },
  {
    type: "delay",
    label: "Delay",
    icon: "Timer",
    category: "function",
    description: "Pause execution for a duration",
  },
  {
    type: "fetch",
    label: "Fetch",
    icon: "Globe",
    category: "function",
    description: "HTTP request to enrich data from external API",
  },
  {
    type: "ai_classify",
    label: "AI Classify",
    icon: "Brain",
    category: "function",
    description: "Run AI model to classify input data",
  },
  {
    type: "ai_generate",
    label: "AI Generate",
    icon: "Sparkles",
    category: "function",
    description: "Generate content using AI",
  },
  {
    type: "transform",
    label: "Transform",
    icon: "Shuffle",
    category: "function",
    description: "Map/reshape data in workflow scope",
  },
  {
    type: "loop",
    label: "Loop",
    icon: "Repeat",
    category: "function",
    description: "Iterate over a list in workflow scope",
  },
  // Actions
  {
    type: "send_message",
    label: "Send Message",
    icon: "Send",
    category: "action",
    description: "Send via Smart Line (iMessage > SMS > email)",
  },
  {
    type: "create_task",
    label: "Create Task",
    icon: "PlusSquare",
    category: "action",
    description: "Create task in universal task table",
  },
  {
    type: "assign",
    label: "Assign",
    icon: "UserPlus",
    category: "action",
    description: "Assign to user, pool, or round-robin group",
  },
  {
    type: "notify",
    label: "Notify",
    icon: "Bell",
    category: "action",
    description: "Send notification via Novu",
  },
  {
    type: "route_to_pool",
    label: "Route to Pool",
    icon: "Users",
    category: "action",
    description: "Route conversation to shared inbox",
  },
  {
    type: "update_record",
    label: "Update Record",
    icon: "Save",
    category: "action",
    description: "Update vault fields or lifecycle_stage",
  },
  {
    type: "set_sla",
    label: "Set SLA",
    icon: "Clock",
    category: "action",
    description: "Start an SLA countdown timer",
  },
  {
    type: "log_event",
    label: "Log Event",
    icon: "FileText",
    category: "action",
    description: "Write to audit trail",
  },
];

export const NODE_CATEGORY_CONFIG: Record<
  NodeCategory,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  trigger: {
    label: "Triggers",
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
    borderColor: "border-teal-500/50",
  },
  function: {
    label: "Functions",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/50",
  },
  action: {
    label: "Actions",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/50",
  },
};

export const WORKFLOW_STATUS_CONFIG: Record<
  WorkflowStatus,
  { label: string; color: string }
> = {
  draft: { label: "Draft", color: "bg-yellow-500" },
  active: { label: "Active", color: "bg-accent-success" },
  inactive: { label: "Inactive", color: "bg-text-muted" },
  archived: { label: "Archived", color: "bg-text-muted" },
};

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  inbound_message: "Inbound Message",
  form_submitted: "Form Submitted",
  stage_change: "Stage Change",
  task_created: "Task Created",
  schedule: "Schedule",
  record_updated: "Record Updated",
  webhook: "Webhook",
  manual: "Manual",
  attachment_received: "Attachment",
  threshold_crossed: "Threshold",
};

export const CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  lead_qualification: "Lead Qual",
  communications: "Comms",
  deal_automation: "Deal Auto",
  notification: "Notification",
  onboarding: "Onboarding",
  contract: "Contract",
  custom: "Custom",
};

/* ── Helpers ──────────────────────────────────────────── */

function minutesAgo(m: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - m);
  return d.toISOString();
}

function daysAgo(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date.toISOString();
}

/* ── Mock workflows ───────────────────────────────────── */

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: "wf_001",
    workspaceId: "ws_1",
    name: "Lead Qualification",
    description:
      "Conversational intake funnel — qualifies and routes inbound leads via AI scoring",
    category: "lead_qualification",
    status: "active",
    triggerType: "inbound_message",
    version: 3,
    publishedAt: daysAgo(14),
    lastRunAt: minutesAgo(12),
    runCount: 147,
    errorCount: 2,
    nodes: [
      {
        id: "trigger-1",
        type: "workflowNode",
        position: { x: 250, y: 0 },
        data: {
          label: "Inbound Message",
          nodeType: "trigger",
          category: "trigger",
          description: "Smart Line messages",
          config: { channels: ["imessage", "sms"] },
        },
      },
      {
        id: "fetch-1",
        type: "workflowNode",
        position: { x: 250, y: 120 },
        data: {
          label: "Phone # Lookup",
          nodeType: "fetch",
          category: "function",
          description: "Check if contact exists",
        },
      },
      {
        id: "branch-1",
        type: "workflowNode",
        position: { x: 250, y: 240 },
        data: {
          label: "Known Contact?",
          nodeType: "branch",
          category: "function",
          config: {
            paths: [
              {
                name: "Yes",
                conditions: [{ field: "contact.id", op: "exists" }],
              },
              { name: "No", conditions: [] },
            ],
          },
        },
      },
      {
        id: "assign-1",
        type: "workflowNode",
        position: { x: 80, y: 380 },
        data: {
          label: "Assign to Rep",
          nodeType: "assign",
          category: "action",
          config: { strategy: "account_owner" },
        },
      },
      {
        id: "classify-1",
        type: "workflowNode",
        position: { x: 420, y: 380 },
        data: {
          label: "AI Score Lead",
          nodeType: "ai_classify",
          category: "function",
          config: { model: "claude-haiku-4-5", outputKey: "lead_score" },
        },
      },
      {
        id: "branch-2",
        type: "workflowNode",
        position: { x: 420, y: 500 },
        data: {
          label: "Score >= 80?",
          nodeType: "branch",
          category: "function",
          config: {
            paths: [
              {
                name: "High",
                conditions: [
                  { field: "variables.lead_score", op: ">=", value: 80 },
                ],
              },
              { name: "Low", conditions: [] },
            ],
          },
        },
      },
      {
        id: "task-1",
        type: "workflowNode",
        position: { x: 300, y: 620 },
        data: {
          label: "Create Task",
          nodeType: "create_task",
          category: "action",
          config: { title: "Follow up with qualified lead" },
        },
      },
      {
        id: "pool-1",
        type: "workflowNode",
        position: { x: 540, y: 620 },
        data: {
          label: "Route to SDR",
          nodeType: "route_to_pool",
          category: "action",
          config: { poolId: "sdr-pool" },
        },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "fetch-1" },
      { id: "e2", source: "fetch-1", target: "branch-1" },
      {
        id: "e3",
        source: "branch-1",
        target: "assign-1",
        sourceHandle: "path-0",
      },
      {
        id: "e4",
        source: "branch-1",
        target: "classify-1",
        sourceHandle: "path-1",
      },
      { id: "e5", source: "classify-1", target: "branch-2" },
      {
        id: "e6",
        source: "branch-2",
        target: "task-1",
        sourceHandle: "path-0",
      },
      {
        id: "e7",
        source: "branch-2",
        target: "pool-1",
        sourceHandle: "path-1",
      },
    ],
    createdBy: "mem_billy",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },
  {
    id: "wf_002",
    workspaceId: "ws_1",
    name: "Smart Line Router",
    description: "Routes inbound Smart Line messages to the right rep or pool",
    category: "communications",
    status: "active",
    triggerType: "inbound_message",
    version: 2,
    publishedAt: daysAgo(10),
    lastRunAt: minutesAgo(3),
    runCount: 342,
    errorCount: 0,
    nodes: [
      {
        id: "t1",
        type: "workflowNode",
        position: { x: 250, y: 0 },
        data: {
          label: "Inbound Message",
          nodeType: "trigger",
          category: "trigger",
        },
      },
      {
        id: "f1",
        type: "workflowNode",
        position: { x: 250, y: 120 },
        data: {
          label: "Contact Lookup",
          nodeType: "fetch",
          category: "function",
        },
      },
      {
        id: "b1",
        type: "workflowNode",
        position: { x: 250, y: 240 },
        data: {
          label: "Has Assigned Rep?",
          nodeType: "branch",
          category: "function",
        },
      },
      {
        id: "a1",
        type: "workflowNode",
        position: { x: 100, y: 360 },
        data: { label: "Route to Rep", nodeType: "assign", category: "action" },
      },
      {
        id: "a2",
        type: "workflowNode",
        position: { x: 400, y: 360 },
        data: {
          label: "Route to Pool",
          nodeType: "route_to_pool",
          category: "action",
        },
      },
    ],
    edges: [
      { id: "e1", source: "t1", target: "f1" },
      { id: "e2", source: "f1", target: "b1" },
      { id: "e3", source: "b1", target: "a1", sourceHandle: "path-0" },
      { id: "e4", source: "b1", target: "a2", sourceHandle: "path-1" },
    ],
    createdBy: "mem_billy",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(5),
  },
  {
    id: "wf_003",
    workspaceId: "ws_1",
    name: "Deal Stage Tasks",
    description:
      "Auto-creates stage-specific tasks when a deal moves in the pipeline",
    category: "deal_automation",
    status: "active",
    triggerType: "stage_change",
    version: 1,
    publishedAt: daysAgo(20),
    lastRunAt: minutesAgo(65),
    runCount: 89,
    errorCount: 1,
    nodes: [
      {
        id: "t1",
        type: "workflowNode",
        position: { x: 250, y: 0 },
        data: {
          label: "Stage Change",
          nodeType: "trigger",
          category: "trigger",
        },
      },
      {
        id: "b1",
        type: "workflowNode",
        position: { x: 250, y: 120 },
        data: {
          label: "Which Stage?",
          nodeType: "branch",
          category: "function",
        },
      },
      {
        id: "a1",
        type: "workflowNode",
        position: { x: 50, y: 260 },
        data: {
          label: "Discovery Tasks",
          nodeType: "create_task",
          category: "action",
        },
      },
      {
        id: "a2",
        type: "workflowNode",
        position: { x: 250, y: 260 },
        data: {
          label: "Proposal Tasks",
          nodeType: "create_task",
          category: "action",
        },
      },
      {
        id: "a3",
        type: "workflowNode",
        position: { x: 450, y: 260 },
        data: {
          label: "Close Tasks",
          nodeType: "create_task",
          category: "action",
        },
      },
    ],
    edges: [
      { id: "e1", source: "t1", target: "b1" },
      { id: "e2", source: "b1", target: "a1", sourceHandle: "path-0" },
      { id: "e3", source: "b1", target: "a2", sourceHandle: "path-1" },
      { id: "e4", source: "b1", target: "a3", sourceHandle: "path-2" },
    ],
    createdBy: "mem_ana",
    createdAt: daysAgo(22),
    updatedAt: daysAgo(8),
  },
  {
    id: "wf_004",
    workspaceId: "ws_1",
    name: "Attachment Handler",
    description:
      "Classifies incoming attachments and routes to appropriate module",
    category: "communications",
    status: "active",
    triggerType: "attachment_received",
    version: 1,
    publishedAt: daysAgo(18),
    lastRunAt: minutesAgo(45),
    runCount: 56,
    errorCount: 0,
    nodes: [
      {
        id: "t1",
        type: "workflowNode",
        position: { x: 250, y: 0 },
        data: {
          label: "Attachment Received",
          nodeType: "trigger",
          category: "trigger",
        },
      },
      {
        id: "c1",
        type: "workflowNode",
        position: { x: 250, y: 120 },
        data: {
          label: "Classify Type",
          nodeType: "ai_classify",
          category: "function",
        },
      },
      {
        id: "b1",
        type: "workflowNode",
        position: { x: 250, y: 240 },
        data: { label: "File Type?", nodeType: "branch", category: "function" },
      },
      {
        id: "a1",
        type: "workflowNode",
        position: { x: 80, y: 380 },
        data: {
          label: "Start Extraction",
          nodeType: "start_workflow",
          category: "action",
        },
      },
      {
        id: "a2",
        type: "workflowNode",
        position: { x: 300, y: 380 },
        data: {
          label: "Create Review Task",
          nodeType: "create_task",
          category: "action",
        },
      },
      {
        id: "a3",
        type: "workflowNode",
        position: { x: 500, y: 380 },
        data: {
          label: "Log to Vault",
          nodeType: "log_event",
          category: "action",
        },
      },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1" },
      { id: "e2", source: "c1", target: "b1" },
      { id: "e3", source: "b1", target: "a1", sourceHandle: "path-0" },
      { id: "e4", source: "b1", target: "a2", sourceHandle: "path-1" },
      { id: "e5", source: "b1", target: "a3", sourceHandle: "path-2" },
    ],
    createdBy: "mem_billy",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(12),
  },
  {
    id: "wf_005",
    workspaceId: "ws_1",
    name: "Customer Onboarding",
    description:
      "Triggers when a deal closes — provisions Smart Line, creates checklist, sends welcome",
    category: "onboarding",
    status: "active",
    triggerType: "stage_change",
    version: 2,
    publishedAt: daysAgo(7),
    lastRunAt: daysAgo(2),
    runCount: 12,
    errorCount: 0,
    nodes: [
      {
        id: "t1",
        type: "workflowNode",
        position: { x: 250, y: 0 },
        data: { label: "Deal Won", nodeType: "trigger", category: "trigger" },
      },
      {
        id: "a1",
        type: "workflowNode",
        position: { x: 250, y: 120 },
        data: {
          label: "Create Checklist",
          nodeType: "create_task",
          category: "action",
        },
      },
      {
        id: "a2",
        type: "workflowNode",
        position: { x: 250, y: 240 },
        data: {
          label: "Send Welcome",
          nodeType: "send_message",
          category: "action",
        },
      },
      {
        id: "a3",
        type: "workflowNode",
        position: { x: 250, y: 360 },
        data: {
          label: "Update Stage",
          nodeType: "update_record",
          category: "action",
        },
      },
      {
        id: "d1",
        type: "workflowNode",
        position: { x: 250, y: 480 },
        data: { label: "Wait 7 Days", nodeType: "delay", category: "function" },
      },
      {
        id: "a4",
        type: "workflowNode",
        position: { x: 250, y: 600 },
        data: {
          label: "Check-in Message",
          nodeType: "send_message",
          category: "action",
        },
      },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1" },
      { id: "e2", source: "a1", target: "a2" },
      { id: "e3", source: "a2", target: "a3" },
      { id: "e4", source: "a3", target: "d1" },
      { id: "e5", source: "d1", target: "a4" },
    ],
    createdBy: "mem_ana",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(3),
  },
  {
    id: "wf_006",
    workspaceId: "ws_1",
    name: "Stale Lead Cleanup",
    description:
      "Daily scan for leads with no activity in 30+ days — sends reminder or archives",
    category: "custom",
    status: "draft",
    triggerType: "schedule",
    version: 1,
    publishedAt: null,
    lastRunAt: null,
    runCount: 0,
    errorCount: 0,
    nodes: [
      {
        id: "t1",
        type: "workflowNode",
        position: { x: 250, y: 0 },
        data: {
          label: "Daily Schedule",
          nodeType: "trigger",
          category: "trigger",
        },
      },
      {
        id: "f1",
        type: "workflowNode",
        position: { x: 250, y: 120 },
        data: {
          label: "Find Stale Leads",
          nodeType: "fetch",
          category: "function",
        },
      },
      {
        id: "l1",
        type: "workflowNode",
        position: { x: 250, y: 240 },
        data: {
          label: "For Each Lead",
          nodeType: "loop",
          category: "function",
        },
      },
      {
        id: "n1",
        type: "workflowNode",
        position: { x: 250, y: 360 },
        data: { label: "Notify Rep", nodeType: "notify", category: "action" },
      },
    ],
    edges: [
      { id: "e1", source: "t1", target: "f1" },
      { id: "e2", source: "f1", target: "l1" },
      { id: "e3", source: "l1", target: "n1" },
    ],
    createdBy: "mem_dave",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
];

/* ── Mock runs ────────────────────────────────────────── */

export const MOCK_WORKFLOW_RUNS: WorkflowRun[] = [
  {
    id: "run_001",
    workflowId: "wf_001",
    status: "completed",
    triggerData: { channel: "imessage", from: "+1 (555) 234-5678" },
    contactName: "Jack Burke",
    vaultName: "Nova Entertainment",
    nodesVisited: 5,
    startedAt: minutesAgo(12),
    completedAt: minutesAgo(12),
    error: null,
  },
  {
    id: "run_002",
    workflowId: "wf_002",
    status: "completed",
    triggerData: { channel: "sms", from: "+1 (555) 987-6543" },
    contactName: "Mike Torres",
    vaultName: "Summit Publishing",
    nodesVisited: 4,
    startedAt: minutesAgo(3),
    completedAt: minutesAgo(3),
    error: null,
  },
  {
    id: "run_003",
    workflowId: "wf_003",
    status: "completed",
    triggerData: { stage: "discovery", previousStage: "prospecting" },
    contactName: null,
    vaultName: "Meridian Records",
    nodesVisited: 3,
    startedAt: minutesAgo(65),
    completedAt: minutesAgo(64),
    error: null,
  },
  {
    id: "run_004",
    workflowId: "wf_001",
    status: "failed",
    triggerData: { channel: "imessage", from: "+1 (555) 111-2222" },
    contactName: null,
    vaultName: null,
    nodesVisited: 2,
    startedAt: daysAgo(1),
    completedAt: daysAgo(1),
    error: "AI Classify timeout after 30s",
  },
  {
    id: "run_005",
    workflowId: "wf_005",
    status: "waiting",
    triggerData: { stage: "won" },
    contactName: "Sarah Kim",
    vaultName: "Drift Audio",
    nodesVisited: 3,
    startedAt: daysAgo(2),
    completedAt: null,
    error: null,
  },
];
