/**
 * Mock CRM data — vault hierarchy as CRM.
 * Accounts = Level 1 vaults, Deals = Level 3 vaults, Leads = new entities.
 * Remove this file once the API + Postgres are available.
 */

// ─── Types ───────────────────────────────────────────────────────

export type PipelineStage =
  | "prospecting"
  | "discovery"
  | "proposal"
  | "negotiation"
  | "close";

export type LeadStage = "new" | "mql" | "sal" | "sql";

export type LeadSource =
  | "contract_upload"
  | "web_form"
  | "smart_line"
  | "entity_resolution"
  | "referral";

export type AccountSegment = "enterprise" | "mid_market" | "smb";

export type StakeholderRole =
  | "champion"
  | "decision_maker"
  | "legal"
  | "finance"
  | "procurement"
  | "evaluator"
  | "influencer";

export interface AccountMemoryEntry {
  id: string;
  channelType: string;
  direction: string;
  visibility: string;
  title: string;
  body: string;
  actorName: string;
  createdAt: string;
  targetLabel?: string;
  workflowName?: string;
  approvalState?: string;
}

export interface AccountArtifact {
  id: string;
  label: string;
  type: string;
  status: string;
  updatedAt: string;
}

export interface AccountMemoryWorkspaceData {
  label: string;
  conceptBadge?: string;
  primaryOwnerName: string;
  pendingApprovals: number;
  openActionItems: number;
  nextRecommendedAction: string;
  stakeholderGap?: string;
  thread: AccountMemoryEntry[];
  stakeholders: unknown[];
  stakeholderGroups: unknown[];
  artifacts: AccountArtifact[];
  aiAssist: { id: string; title: string; detail: string; confidence: string }[];
}

export interface CrmContact {
  id: string;
  name: string;
  role: string;
  interactionCount: number;
  lastInteraction: string;
}

export interface CrmAccount {
  id: string;
  name: string;
  segment: AccountSegment;
  healthScore: number;
  healthTrend: number;
  dealCount: number;
  totalValue: number;
  contacts: CrmContact[];
  lastContact: string;
  currentChamber?: string;
  contractReadiness?: string;
  accountMemory?: AccountMemoryWorkspaceData;
}

export interface CrmDeal {
  id: string;
  accountName: string;
  vaultSlug: string;
  title: string;
  value: number;
  stage: PipelineStage;
  assignedRep: string;
  taskCount: number;
  overdueTaskCount: number;
  daysInStage: number;
  progressPercent: number;
  nextTask: string | null;
}

export interface CrmLead {
  id: string;
  name: string;
  matchStatus: "matched" | "unmatched" | "unknown";
  source: LeadSource;
  score: number | null;
  stage: LeadStage;
  assignedRep: string | null;
  ageDays: number;
}

// ─── Helpers ─────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

// ─── Pipeline Stage Config ───────────────────────────────────────

export const PIPELINE_STAGES: {
  id: PipelineStage;
  label: string;
  color: string;
}[] = [
  { id: "prospecting", label: "Prospecting", color: "bg-accent-primary" },
  { id: "discovery", label: "Discovery", color: "bg-accent-secondary" },
  { id: "proposal", label: "Proposal", color: "bg-chamber-review" },
  { id: "negotiation", label: "Negotiation", color: "bg-accent-warning" },
  { id: "close", label: "Close", color: "bg-accent-success" },
];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  contract_upload: "Contract Upload",
  web_form: "Web Form",
  smart_line: "Smart Line",
  entity_resolution: "Entity Resolution",
  referral: "Referral",
};

export const LEAD_STAGE_CONFIG: Record<
  LeadStage,
  { label: string; color: string }
> = {
  new: { label: "New", color: "bg-text-muted" },
  mql: { label: "MQL", color: "bg-accent-primary" },
  sal: { label: "SAL", color: "bg-accent-secondary" },
  sql: { label: "SQL", color: "bg-accent-success" },
};

export const SEGMENT_LABELS: Record<AccountSegment, string> = {
  enterprise: "Enterprise",
  mid_market: "Mid-Market",
  smb: "SMB",
};

// ─── Accounts ────────────────────────────────────────────────────

export const MOCK_CRM_ACCOUNTS: CrmAccount[] = [
  {
    id: "acct_001",
    name: "Nova Entertainment",
    segment: "enterprise",
    healthScore: 82,
    healthTrend: 3,
    dealCount: 2,
    totalValue: 180000,
    contacts: [
      {
        id: "cnt_001",
        name: "Jack Chen",
        role: "Biz Dev",
        interactionCount: 12,
        lastInteraction: hoursAgo(0.2),
      },
      {
        id: "cnt_002",
        name: "Sarah Kim",
        role: "Legal",
        interactionCount: 5,
        lastInteraction: daysAgo(3),
      },
      {
        id: "cnt_003",
        name: "Mike Torres",
        role: "CFO",
        interactionCount: 1,
        lastInteraction: daysAgo(1),
      },
    ],
    lastContact: hoursAgo(0.2),
  },
  {
    id: "acct_002",
    name: "Acme Inc",
    segment: "mid_market",
    healthScore: 91,
    healthTrend: 1,
    dealCount: 1,
    totalValue: 85000,
    contacts: [
      {
        id: "cnt_004",
        name: "Sarah Kim",
        role: "Billing",
        interactionCount: 3,
        lastInteraction: daysAgo(2),
      },
      {
        id: "cnt_005",
        name: "Tom Barker",
        role: "Ops",
        interactionCount: 1,
        lastInteraction: daysAgo(5),
      },
    ],
    lastContact: daysAgo(2),
  },
  {
    id: "acct_003",
    name: "Summit Media",
    segment: "enterprise",
    healthScore: 54,
    healthTrend: -12,
    dealCount: 1,
    totalValue: 240000,
    contacts: [
      {
        id: "cnt_006",
        name: "Rachel Adams",
        role: "VP Partnerships",
        interactionCount: 8,
        lastInteraction: daysAgo(14),
      },
    ],
    lastContact: daysAgo(14),
  },
  {
    id: "acct_004",
    name: "Ostereo Music Group",
    segment: "enterprise",
    healthScore: 78,
    healthTrend: -2,
    dealCount: 1,
    totalValue: 180000,
    contacts: [
      {
        id: "cnt_007",
        name: "Daniele Leoni",
        role: "A&R",
        interactionCount: 15,
        lastInteraction: daysAgo(1),
      },
      {
        id: "cnt_008",
        name: "Marco Bianchi",
        role: "Legal",
        interactionCount: 4,
        lastInteraction: daysAgo(7),
      },
    ],
    lastContact: daysAgo(1),
  },
  {
    id: "acct_005",
    name: "TechFlow Inc",
    segment: "smb",
    healthScore: 65,
    healthTrend: 0,
    dealCount: 1,
    totalValue: 60000,
    contacts: [
      {
        id: "cnt_009",
        name: "Alex Turner",
        role: "CEO",
        interactionCount: 2,
        lastInteraction: daysAgo(3),
      },
    ],
    lastContact: daysAgo(3),
  },
];

// ─── Deals (Pipeline) ───────────────────────────────────────────

export const MOCK_CRM_DEALS: CrmDeal[] = [
  {
    id: "deal_001",
    accountName: "Nova Entertainment",
    vaultSlug: "henderson-msa",
    title: "Henderson MSA",
    value: 120000,
    stage: "prospecting",
    assignedRep: "Sarah Miller",
    taskCount: 3,
    overdueTaskCount: 1,
    daysInStage: 5,
    progressPercent: 40,
    nextTask: "Send proposal",
  },
  {
    id: "deal_002",
    accountName: "TechFlow Inc",
    vaultSlug: "techflow-dist",
    title: "TechFlow Distribution",
    value: 60000,
    stage: "prospecting",
    assignedRep: "",
    taskCount: 0,
    overdueTaskCount: 0,
    daysInStage: 1,
    progressPercent: 0,
    nextTask: null,
  },
  {
    id: "deal_003",
    accountName: "Acme Inc",
    vaultSlug: "acme-license",
    title: "Acme License Agreement",
    value: 85000,
    stage: "discovery",
    assignedRep: "Ana Chen",
    taskCount: 2,
    overdueTaskCount: 0,
    daysInStage: 12,
    progressPercent: 60,
    nextTask: "Schedule demo",
  },
  {
    id: "deal_004",
    accountName: "Summit Media",
    vaultSlug: "summit-msa",
    title: "Summit Master Agreement",
    value: 240000,
    stage: "proposal",
    assignedRep: "Sarah Miller",
    taskCount: 4,
    overdueTaskCount: 0,
    daysInStage: 8,
    progressPercent: 50,
    nextTask: "Finalize pricing",
  },
  {
    id: "deal_005",
    accountName: "Ostereo Music Group",
    vaultSlug: "ostereo-msa",
    title: "Ostereo Master Services",
    value: 180000,
    stage: "close",
    assignedRep: "David Park",
    taskCount: 1,
    overdueTaskCount: 0,
    daysInStage: 21,
    progressPercent: 90,
    nextTask: "Final signature",
  },
  {
    id: "deal_006",
    accountName: "Nova Entertainment",
    vaultSlug: "nova-q2-expansion",
    title: "Nova Q2 Expansion",
    value: 60000,
    stage: "discovery",
    assignedRep: "Ana Chen",
    taskCount: 1,
    overdueTaskCount: 0,
    daysInStage: 3,
    progressPercent: 20,
    nextTask: "Needs assessment",
  },
];

// ─── Leads ───────────────────────────────────────────────────────

export const MOCK_CRM_LEADS: CrmLead[] = [
  {
    id: "lead_001",
    name: "TechFlow Inc",
    matchStatus: "matched",
    source: "contract_upload",
    score: 72,
    stage: "new",
    assignedRep: null,
    ageDays: 3,
  },
  {
    id: "lead_002",
    name: "Lisa Park",
    matchStatus: "unmatched",
    source: "web_form",
    score: null,
    stage: "new",
    assignedRep: null,
    ageDays: 1,
  },
  {
    id: "lead_003",
    name: "+1-555-0199",
    matchStatus: "unknown",
    source: "smart_line",
    score: null,
    stage: "new",
    assignedRep: null,
    ageDays: 0,
  },
  {
    id: "lead_004",
    name: "MediaWorks LLC",
    matchStatus: "matched",
    source: "entity_resolution",
    score: 65,
    stage: "mql",
    assignedRep: "Ana Chen",
    ageDays: 5,
  },
  {
    id: "lead_005",
    name: "Pinnacle Partners",
    matchStatus: "matched",
    source: "referral",
    score: 81,
    stage: "sal",
    assignedRep: "Sarah Miller",
    ageDays: 7,
  },
  {
    id: "lead_006",
    name: "Cascade Audio",
    matchStatus: "matched",
    source: "entity_resolution",
    score: 58,
    stage: "new",
    assignedRep: null,
    ageDays: 2,
  },
  {
    id: "lead_007",
    name: "Rhythm & Blues Publishing",
    matchStatus: "matched",
    source: "contract_upload",
    score: 44,
    stage: "new",
    assignedRep: null,
    ageDays: 4,
  },
  {
    id: "lead_008",
    name: "Vertex Studios",
    matchStatus: "matched",
    source: "referral",
    score: 88,
    stage: "sql",
    assignedRep: "Sarah Miller",
    ageDays: 10,
  },
];

// ─── CRM Reps (for filter dropdowns) ────────────────────────────

export const MOCK_CRM_REPS = [
  "Sarah Miller",
  "Ana Chen",
  "David Park",
  "Marcus Webb",
];

export const CHAMBER_LABELS: Record<string, string> = {
  discover: "Discover",
  build: "Build",
  review: "Review",
  ship: "Ship",
};

export const CONTRACT_READINESS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  ready: "Ready",
  blocked: "Blocked",
};

export const STAKEHOLDER_ROLE_LABELS: Record<StakeholderRole, string> = {
  champion: "Champion",
  decision_maker: "Decision Maker",
  legal: "Legal",
  finance: "Finance",
  procurement: "Procurement",
  evaluator: "Evaluator",
  influencer: "Influencer",
};
