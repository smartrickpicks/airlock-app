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

/* ------------------------------------------------------------------ */
/*  Archetype-matched templates (all nodes pending = view-only)       */
/* ------------------------------------------------------------------ */

/** Driver template: fast-track, fewer gates */
export const PLAYBOOK_DRIVER: PlaybookDAGData = {
  templateId: "tpl_contract_intake",
  templateName: "Contract Intake — Fast Track",
  templateDescription: "Streamlined contract lifecycle for decisive operators",
  instanceId: "run_driver_001",
  nodes: [
    {
      id: "triage",
      name: "Triage",
      description: "Quick classification and priority",
      actor: "otto",
      archetype: "executor",
      chamber: "discover",
      status: "pending",
      dependsOn: [],
      gate: null,
    },
    {
      id: "research",
      name: "Research",
      description: "Rapid counterparty analysis",
      actor: "otto",
      archetype: "strategist",
      chamber: "discover",
      status: "pending",
      dependsOn: ["triage"],
      gate: null,
    },
    {
      id: "extract_terms",
      name: "Extract Terms",
      description: "Automated term extraction",
      actor: "otto",
      archetype: "executor",
      chamber: "build",
      status: "pending",
      dependsOn: ["research"],
      gate: null,
    },
    {
      id: "draft_agreement",
      name: "Draft Agreement",
      description: "Generate agreement from extracted terms",
      actor: "otto",
      archetype: "executor",
      chamber: "build",
      status: "pending",
      dependsOn: ["extract_terms"],
      gate: {
        type: "verification",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Quick verification of draft",
      },
    },
    {
      id: "publish_distribute",
      name: "Publish & Distribute",
      description: "Ship to all parties",
      actor: "hybrid",
      archetype: "executor",
      chamber: "ship",
      status: "pending",
      dependsOn: ["draft_agreement"],
      gate: null,
    },
  ],
  edges: [
    { source: "triage", target: "research" },
    { source: "research", target: "extract_terms" },
    { source: "extract_terms", target: "draft_agreement" },
    { source: "draft_agreement", target: "publish_distribute" },
  ],
};

/** Enforcer template: process-heavy, compliance gates */
export const PLAYBOOK_ENFORCER: PlaybookDAGData = {
  templateId: "tpl_pilot_close",
  templateName: "Pilot Close — Compliance Path",
  templateDescription: "Thorough lifecycle with compliance checkpoints",
  instanceId: "run_enforcer_001",
  nodes: [
    {
      id: "intake",
      name: "Intake Review",
      description: "Detailed intake and classification",
      actor: "otto",
      archetype: "analyst",
      chamber: "discover",
      status: "pending",
      dependsOn: [],
      gate: null,
    },
    {
      id: "compliance_scan",
      name: "Compliance Scan",
      description: "Regulatory compliance pre-check",
      actor: "otto",
      archetype: "guardian",
      chamber: "discover",
      status: "pending",
      dependsOn: ["intake"],
      gate: {
        type: "verification",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Verify compliance requirements",
      },
    },
    {
      id: "terms_extraction",
      name: "Terms Extraction",
      description: "Detailed term extraction with validation",
      actor: "hybrid",
      archetype: "analyst",
      chamber: "build",
      status: "pending",
      dependsOn: ["compliance_scan"],
      gate: null,
    },
    {
      id: "risk_assessment",
      name: "Risk Assessment",
      description: "Comprehensive risk analysis",
      actor: "otto",
      archetype: "guardian",
      chamber: "build",
      status: "pending",
      dependsOn: ["terms_extraction"],
      gate: {
        type: "approval",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Approve risk assessment findings",
      },
    },
    {
      id: "legal_review",
      name: "Legal Review",
      description: "Full legal compliance review",
      actor: "human",
      archetype: "guardian",
      chamber: "review",
      status: "pending",
      dependsOn: ["risk_assessment"],
      gate: {
        type: "approval",
        status: "pending",
        requiredApprovals: 2,
        currentApprovals: 0,
        roles: ["gatekeeper", "owner"],
        description: "Dual sign-off on legal review",
      },
    },
    {
      id: "stakeholder_signoff",
      name: "Stakeholder Sign-off",
      description: "Cross-functional approval",
      actor: "human",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["legal_review"],
      gate: null,
    },
    {
      id: "publish",
      name: "Publish & Archive",
      description: "Publish and archive with full audit trail",
      actor: "hybrid",
      archetype: "guardian",
      chamber: "ship",
      status: "pending",
      dependsOn: ["stakeholder_signoff"],
      gate: null,
    },
  ],
  edges: [
    { source: "intake", target: "compliance_scan" },
    { source: "compliance_scan", target: "terms_extraction" },
    { source: "terms_extraction", target: "risk_assessment" },
    { source: "risk_assessment", target: "legal_review" },
    { source: "legal_review", target: "stakeholder_signoff" },
    { source: "stakeholder_signoff", target: "publish" },
  ],
};

/** Interpreter template: collaborative, human touchpoints */
export const PLAYBOOK_INTERPRETER: PlaybookDAGData = {
  templateId: "tpl_research_deep_dive",
  templateName: "Research Deep Dive — Collaborative",
  templateDescription: "Collaborative workflow with team checkpoints",
  instanceId: "run_interpreter_001",
  nodes: [
    {
      id: "discover_context",
      name: "Discover Context",
      description: "Gather context from all stakeholders",
      actor: "hybrid",
      archetype: "connector",
      chamber: "discover",
      status: "pending",
      dependsOn: [],
      gate: null,
    },
    {
      id: "team_input",
      name: "Team Input",
      description: "Collect perspectives from team members",
      actor: "human",
      archetype: "connector",
      chamber: "discover",
      status: "pending",
      dependsOn: ["discover_context"],
      gate: {
        type: "convergence",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["builder"],
        description: "Ensure all perspectives captured",
      },
    },
    {
      id: "research",
      name: "Deep Research",
      description: "Collaborative research synthesis",
      actor: "hybrid",
      archetype: "strategist",
      chamber: "build",
      status: "pending",
      dependsOn: ["team_input"],
      gate: null,
    },
    {
      id: "draft",
      name: "Collaborative Draft",
      description: "Co-create deliverable with team",
      actor: "hybrid",
      archetype: "connector",
      chamber: "build",
      status: "pending",
      dependsOn: ["research"],
      gate: null,
    },
    {
      id: "team_review",
      name: "Team Review",
      description: "Full team review and feedback",
      actor: "human",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["draft"],
      gate: {
        type: "decision",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Team decides on direction",
      },
    },
    {
      id: "refinement",
      name: "Refinement",
      description: "Incorporate feedback and refine",
      actor: "hybrid",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["team_review"],
      gate: null,
    },
    {
      id: "consensus_check",
      name: "Consensus Check",
      description: "Verify team alignment",
      actor: "human",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["refinement"],
      gate: {
        type: "convergence",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["builder", "gatekeeper"],
        description: "Confirm consensus reached",
      },
    },
    {
      id: "ship",
      name: "Share & Celebrate",
      description: "Share results with broader team",
      actor: "hybrid",
      archetype: "connector",
      chamber: "ship",
      status: "pending",
      dependsOn: ["consensus_check"],
      gate: null,
    },
  ],
  edges: [
    { source: "discover_context", target: "team_input" },
    { source: "team_input", target: "research" },
    { source: "research", target: "draft" },
    { source: "draft", target: "team_review" },
    { source: "team_review", target: "refinement" },
    { source: "refinement", target: "consensus_check" },
    { source: "consensus_check", target: "ship" },
  ],
};

/** Map meta-archetype to its playbook template */
export const ARCHETYPE_PLAYBOOK_MAP: Record<string, PlaybookDAGData> = {
  driver: PLAYBOOK_DRIVER,
  enforcer: PLAYBOOK_ENFORCER,
  interpreter: PLAYBOOK_INTERPRETER,
};
