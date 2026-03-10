/* ------------------------------------------------------------------ */
/*  Playbook DAG — Types & Mock Data                                  */
/*  M9: Playbook Visualization                                       */
/* ------------------------------------------------------------------ */

export type DAGNodeStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "skipped";

export type ActorType = "otto" | "human" | "hybrid";

export type Chamber = "discover" | "build" | "review" | "ship";

export interface DAGGateInfo {
  type: "verification" | "approval" | "density" | "decision" | "convergence";
  status: "pending" | "approved" | "rejected" | "waiting";
  requiredApprovals: number;
  currentApprovals: number;
  roles: string[];
  description: string;
}

export interface DAGNodeData {
  id: string;
  name: string;
  description: string;
  actor: ActorType;
  archetype: string;
  chamber: Chamber;
  status: DAGNodeStatus;
  dependsOn: string[];
  gate: DAGGateInfo | null;
}

export interface DAGEdgeData {
  source: string;
  target: string;
}

export interface PlaybookDAGData {
  templateId: string;
  templateName: string;
  templateDescription: string;
  instanceId: string;
  nodes: DAGNodeData[];
  edges: DAGEdgeData[];
}

/* ------------------------------------------------------------------ */
/*  Helper: compute aggregate progress from DAG data                  */
/* ------------------------------------------------------------------ */

export interface DAGProgress {
  completed: number;
  blocked: number;
  inProgress: number;
  pending: number;
  total: number;
  percent: number;
}

export function computeProgress(data: PlaybookDAGData): DAGProgress {
  const total = data.nodes.length;
  let completed = 0;
  let blocked = 0;
  let inProgress = 0;
  let pending = 0;

  for (const node of data.nodes) {
    switch (node.status) {
      case "completed":
        completed++;
        break;
      case "blocked":
        blocked++;
        break;
      case "in_progress":
        inProgress++;
        break;
      case "pending":
        pending++;
        break;
      case "skipped":
        // Skipped nodes are resolved — don't count as pending work
        break;
    }
  }

  const skipped = data.nodes.filter((n) => n.status === "skipped").length;
  const actionable = total - skipped;
  const percent =
    actionable > 0 ? Math.round((completed / actionable) * 100) : 0;

  return { completed, blocked, inProgress, pending, total, percent };
}

/* ------------------------------------------------------------------ */
/*  Shared node definitions (contract-intake playbook)                */
/* ------------------------------------------------------------------ */

const CONTRACT_INTAKE_TEMPLATE = {
  templateId: "tpl_contract_intake",
  templateName: "Contract Intake",
  templateDescription:
    "End-to-end contract lifecycle from triage through distribution",
};

const CONTRACT_INTAKE_EDGES: DAGEdgeData[] = [
  { source: "triage", target: "research" },
  { source: "research", target: "extract_terms" },
  { source: "extract_terms", target: "draft_agreement" },
  { source: "draft_agreement", target: "compliance_review" },
  { source: "compliance_review", target: "stakeholder_alignment" },
  { source: "stakeholder_alignment", target: "publish_distribute" },
];

/* ------------------------------------------------------------------ */
/*  Mock 1: Mid-execution (draft_agreement is in_progress)            */
/* ------------------------------------------------------------------ */

export const MOCK_DAG_IN_PROGRESS: PlaybookDAGData = {
  ...CONTRACT_INTAKE_TEMPLATE,
  instanceId: "run_01HWXYZ123456",
  nodes: [
    {
      id: "triage",
      name: "Triage",
      description: "Initial classification and priority assignment",
      actor: "otto",
      archetype: "analyst",
      chamber: "discover",
      status: "completed",
      dependsOn: [],
      gate: null,
    },
    {
      id: "research",
      name: "Research",
      description: "Strategic research on counterparty and market context",
      actor: "otto",
      archetype: "strategist",
      chamber: "discover",
      status: "completed",
      dependsOn: ["triage"],
      gate: null,
    },
    {
      id: "extract_terms",
      name: "Extract Terms",
      description: "Automated extraction and validation of contract terms",
      actor: "otto",
      archetype: "executor",
      chamber: "build",
      status: "completed",
      dependsOn: ["research"],
      gate: {
        type: "verification",
        status: "approved",
        requiredApprovals: 1,
        currentApprovals: 1,
        roles: ["gatekeeper"],
        description: "Verify extracted terms match source documents",
      },
    },
    {
      id: "draft_agreement",
      name: "Draft Agreement",
      description:
        "Generate agreement draft from extracted terms and templates",
      actor: "hybrid",
      archetype: "executor",
      chamber: "build",
      status: "in_progress",
      dependsOn: ["extract_terms"],
      gate: null,
    },
    {
      id: "compliance_review",
      name: "Compliance Review",
      description: "Legal and regulatory compliance assessment",
      actor: "hybrid",
      archetype: "guardian",
      chamber: "review",
      status: "pending",
      dependsOn: ["draft_agreement"],
      gate: {
        type: "approval",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Approve compliance review findings",
      },
    },
    {
      id: "stakeholder_alignment",
      name: "Stakeholder Alignment",
      description: "Cross-functional sign-off from all relevant stakeholders",
      actor: "human",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["compliance_review"],
      gate: null,
    },
    {
      id: "publish_distribute",
      name: "Publish & Distribute",
      description: "Final publishing and distribution to all parties",
      actor: "hybrid",
      archetype: "executor",
      chamber: "ship",
      status: "pending",
      dependsOn: ["stakeholder_alignment"],
      gate: null,
    },
  ],
  edges: CONTRACT_INTAKE_EDGES,
};

/* ------------------------------------------------------------------ */
/*  Mock 2: Blocked at compliance gate (waiting for approval)         */
/* ------------------------------------------------------------------ */

export const MOCK_DAG_AT_GATE: PlaybookDAGData = {
  ...CONTRACT_INTAKE_TEMPLATE,
  instanceId: "run_01HWXYZ789012",
  nodes: [
    {
      id: "triage",
      name: "Triage",
      description: "Initial classification and priority assignment",
      actor: "otto",
      archetype: "analyst",
      chamber: "discover",
      status: "completed",
      dependsOn: [],
      gate: null,
    },
    {
      id: "research",
      name: "Research",
      description: "Strategic research on counterparty and market context",
      actor: "otto",
      archetype: "strategist",
      chamber: "discover",
      status: "completed",
      dependsOn: ["triage"],
      gate: null,
    },
    {
      id: "extract_terms",
      name: "Extract Terms",
      description: "Automated extraction and validation of contract terms",
      actor: "otto",
      archetype: "executor",
      chamber: "build",
      status: "completed",
      dependsOn: ["research"],
      gate: {
        type: "verification",
        status: "approved",
        requiredApprovals: 1,
        currentApprovals: 1,
        roles: ["gatekeeper"],
        description: "Verify extracted terms match source documents",
      },
    },
    {
      id: "draft_agreement",
      name: "Draft Agreement",
      description:
        "Generate agreement draft from extracted terms and templates",
      actor: "hybrid",
      archetype: "executor",
      chamber: "build",
      status: "completed",
      dependsOn: ["extract_terms"],
      gate: null,
    },
    {
      id: "compliance_review",
      name: "Compliance Review",
      description: "Legal and regulatory compliance assessment",
      actor: "hybrid",
      archetype: "guardian",
      chamber: "review",
      status: "blocked",
      dependsOn: ["draft_agreement"],
      gate: {
        type: "approval",
        status: "waiting",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Approve compliance review findings",
      },
    },
    {
      id: "stakeholder_alignment",
      name: "Stakeholder Alignment",
      description: "Cross-functional sign-off from all relevant stakeholders",
      actor: "human",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["compliance_review"],
      gate: null,
    },
    {
      id: "publish_distribute",
      name: "Publish & Distribute",
      description: "Final publishing and distribution to all parties",
      actor: "hybrid",
      archetype: "executor",
      chamber: "ship",
      status: "pending",
      dependsOn: ["stakeholder_alignment"],
      gate: null,
    },
  ],
  edges: CONTRACT_INTAKE_EDGES,
};
