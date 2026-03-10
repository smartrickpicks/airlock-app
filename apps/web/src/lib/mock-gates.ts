/**
 * Mock data for the Gate UI system — checkpoint workflows within chambers.
 * Remove this file once the API + Postgres are available.
 */

// ─── Types ───────────────────────────────────────────────────────

export type GateType =
  | "verification"
  | "approval"
  | "density"
  | "decision"
  | "convergence";

export type GateAction = "approve" | "reject" | "request_changes";

export type GateUrgency = "green" | "amber" | "red";

export interface GateApproval {
  responderId: string;
  responderName: string;
  action: GateAction;
  comment: string | null;
  respondedAt: string;
}

export interface GateCardData {
  id: string;
  vaultId: string;
  vaultName: string;
  nodeId: string;
  nodeName: string;
  gateType: GateType;
  chamber: "discover" | "build" | "review" | "ship";
  assignee: string;
  slaDeadline: string;
  urgency: GateUrgency;
  requiredApprovals: number;
  currentApprovals: number;
  description: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
}

export interface GateResponseState {
  gateType: GateType;
  nodeId: string;
  nodeName: string;
  description: string;
  requiredApprovals: number;
  approvals: GateApproval[];
  roles: string[];
  approved: boolean;
  /** Decision gate specific */
  options?: DecisionOption[];
  /** Convergence gate specific */
  summary?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function hoursFromNow(n: number): string {
  return new Date(Date.now() + n * 60 * 60 * 1000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

// ─── Gate Card Data (Signal panel notifications) ────────────────

export const MOCK_GATE_CARDS: GateCardData[] = [
  {
    id: "gc_001",
    vaultId: "v_ostereo_summit",
    vaultName: "Ostereo x Summit Publishing",
    nodeId: "node_extraction_verify",
    nodeName: "Extraction Verification",
    gateType: "verification",
    chamber: "build",
    assignee: "Daniele Leoni",
    slaDeadline: hoursFromNow(2),
    urgency: "amber",
    requiredApprovals: 1,
    currentApprovals: 0,
    description:
      "Verify extracted contract terms match the source PDF for the Ostereo distribution agreement.",
  },
  {
    id: "gc_002",
    vaultId: "v_broke_harmony",
    vaultName: "Broke Records x Harmony Digital",
    nodeId: "node_legal_approval",
    nodeName: "Legal Sign-Off",
    gateType: "approval",
    chamber: "review",
    assignee: "Ana Chen",
    slaDeadline: hoursFromNow(8),
    urgency: "green",
    requiredApprovals: 2,
    currentApprovals: 1,
    description:
      "Legal team sign-off required before the Harmony Digital distribution deal can proceed to Ship.",
  },
  {
    id: "gc_003",
    vaultId: "v_getdough_apex",
    vaultName: "Get Dough x Apex Films",
    nodeId: "node_density_check",
    nodeName: "Data Density Check",
    gateType: "density",
    chamber: "build",
    assignee: "Marcus Webb",
    slaDeadline: hoursFromNow(0.5),
    urgency: "red",
    requiredApprovals: 1,
    currentApprovals: 0,
    description:
      "Minimum data coverage threshold not met for the Apex Films license agreement. Review field completeness.",
  },
  {
    id: "gc_004",
    vaultId: "v_ostereo_coastal",
    vaultName: "Ostereo x Coastal Media",
    nodeId: "node_territory_decision",
    nodeName: "Territory Strategy",
    gateType: "decision",
    chamber: "discover",
    assignee: "Jordan Blake",
    slaDeadline: hoursFromNow(24),
    urgency: "green",
    requiredApprovals: 1,
    currentApprovals: 0,
    description:
      "Select the territory strategy for the Coastal Media publishing agreement.",
  },
  {
    id: "gc_005",
    vaultId: "v_broke_tempo",
    vaultName: "Broke Records x Tempo Sync",
    nodeId: "node_final_review",
    nodeName: "Final Review Summary",
    gateType: "convergence",
    chamber: "ship",
    assignee: "Ana Chen",
    slaDeadline: hoursFromNow(4),
    urgency: "amber",
    requiredApprovals: 1,
    currentApprovals: 0,
    description:
      "Review the aggregated summary of all extraction and patch results before shipment.",
  },
];

// ─── Gate Response States (one per gate type) ────────────────────

export const MOCK_GATE_RESPONSES: Record<GateType, GateResponseState> = {
  verification: {
    gateType: "verification",
    nodeId: "node_extraction_verify",
    nodeName: "Extraction Verification",
    description:
      "Verify that extracted contract terms match the source PDF. Check entity names, dates, territory, and royalty rates against the original document.",
    requiredApprovals: 1,
    approvals: [],
    roles: ["gatekeeper", "builder"],
    approved: false,
  },
  approval: {
    gateType: "approval",
    nodeId: "node_legal_approval",
    nodeName: "Legal Sign-Off",
    description:
      "Legal team must review all contract terms, amendments, and side letters before this vault can proceed to Ship chamber.",
    requiredApprovals: 2,
    approvals: [
      {
        responderId: "usr_ana",
        responderName: "Ana Chen",
        action: "approve",
        comment:
          "Terms verified against standard template. Territory clause is compliant.",
        respondedAt: minutesAgo(45),
      },
    ],
    roles: ["gatekeeper", "owner"],
    approved: false,
  },
  density: {
    gateType: "density",
    nodeId: "node_density_check",
    nodeName: "Data Density Check",
    description:
      "All required fields must meet the minimum coverage threshold of 85%. Currently at 72% — review missing fields and request corrections.",
    requiredApprovals: 1,
    approvals: [],
    roles: ["gatekeeper"],
    approved: false,
  },
  decision: {
    gateType: "decision",
    nodeId: "node_territory_decision",
    nodeName: "Territory Strategy",
    description:
      "Select the territory approach for the Coastal Media publishing agreement. This determines downstream royalty calculations and reporting obligations.",
    requiredApprovals: 1,
    approvals: [],
    roles: ["owner", "gatekeeper"],
    approved: false,
    options: [
      {
        id: "opt_worldwide",
        label: "Worldwide",
        description:
          "Full global rights including digital-only territories. Highest advance, broadest coverage.",
        recommended: true,
      },
      {
        id: "opt_domestic",
        label: "Domestic Only",
        description:
          "US and Canada only. Lower advance but simpler reporting and fewer compliance requirements.",
      },
      {
        id: "opt_tiered",
        label: "Tiered Territories",
        description:
          "Primary markets (US, UK, EU) on launch, with option to expand to secondary markets after 12 months.",
      },
    ],
  },
  convergence: {
    gateType: "convergence",
    nodeId: "node_final_review",
    nodeName: "Final Review Summary",
    description:
      "Review the aggregated results from all prior gates before approving shipment.",
    requiredApprovals: 1,
    approvals: [
      {
        responderId: "usr_jordan",
        responderName: "Jordan Blake",
        action: "approve",
        comment: null,
        respondedAt: hoursAgo(1),
      },
    ],
    roles: ["owner"],
    approved: false,
    summary:
      "All 15 child vaults have completed extraction with an average confidence of 94%. 3 corrections were applied and verified. 1 RFI remains open but is non-blocking (territory clarification for digital-only markets). Data density across all vaults exceeds the 85% threshold. Legal sign-off obtained from Ana Chen. The vault is ready for final owner approval and shipment to the counterparty.",
  },
};

// ─── Gate type metadata ──────────────────────────────────────────

export const GATE_TYPE_LABELS: Record<GateType, string> = {
  verification: "Verification",
  approval: "Approval",
  density: "Quality Check",
  decision: "Decision",
  convergence: "Convergence",
};

export const GATE_TYPE_ICONS: Record<GateType, string> = {
  verification: "Shield",
  approval: "CheckCircle",
  density: "BarChart3",
  decision: "GitBranch",
  convergence: "Layers",
};
