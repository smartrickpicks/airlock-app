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
  | "website_form"
  | "smart_line"
  | "entity_resolution"
  | "referral"
  | "manual_rep_entry"
  | "dedicated_text"
  | "meeting_transcript";

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
  linkedArtifactIds?: string[];
}

export interface AccountArtifact {
  id: string;
  label: string;
  type: string;
  status: string;
  updatedAt: string;
}

export interface Stakeholder {
  id: string;
  contactId?: string;
  name: string;
  roleTitle: string;
  stakeholderRole: StakeholderRole;
  influence: string;
  status: string;
  sentiment: string;
  decisionRole: string;
  ownerName: string;
  notes: string;
  channelLabels: string[];
  lastTouched: string;
}

export interface StakeholderGroup {
  id: string;
  name: string;
  description: string;
  members: string[];
  channelModes: string[];
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
  stakeholders: Stakeholder[];
  stakeholderGroups: StakeholderGroup[];
  artifacts: AccountArtifact[];
  aiAssist: { id: string; title: string; detail: string; confidence: string }[];
}

export interface CrmContact {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
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
  latestSummary?: string;
  workflowName?: string;
  primaryOwnerName?: string;
  pendingGateCount?: number;
  nextRecommendedAction?: string;
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
  currentChamber?: string;
  contractReadiness?: string;
  latestSummary?: string;
  nextRecommendedAction?: string;
  workflowName?: string;
  pendingGateCount?: number;
  intakeSource?: LeadSource;
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
  currentChamber?: string;
  contractReadiness?: string;
  latestSummary?: string;
  nextRecommendedAction?: string;
  workflowName?: string;
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
  website_form: "Website Form",
  smart_line: "Smart Line",
  entity_resolution: "Entity Resolution",
  referral: "Referral",
  manual_rep_entry: "Manual Rep Entry",
  dedicated_text: "Dedicated Text",
  meeting_transcript: "Meeting Transcript",
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
    name: "Empire Distribution",
    segment: "enterprise",
    healthScore: 88,
    healthTrend: 5,
    dealCount: 2,
    totalValue: 170000,
    contacts: [
      {
        id: "cnt_001",
        name: "Marcus Webb",
        role: "A&R Director",
        interactionCount: 15,
        lastInteraction: hoursAgo(2),
      },
      {
        id: "cnt_002",
        name: "Priya Shah",
        role: "Contracts Manager",
        interactionCount: 8,
        lastInteraction: daysAgo(2),
      },
      {
        id: "cnt_003",
        name: "Daniel Reeves",
        role: "VP Distribution",
        interactionCount: 3,
        lastInteraction: daysAgo(5),
      },
    ],
    lastContact: hoursAgo(2),
    currentChamber: "build",
    contractReadiness: "terms_pending",
    latestSummary:
      "Two active deals — Nova Lux worldwide distro shipped, Barclay direct distro in discovery. Strong relationship.",
    primaryOwnerName: "Luna Torres",
    pendingGateCount: 1,
  },
  {
    id: "acct_002",
    name: "Nettwerk Music Group",
    segment: "mid_market",
    healthScore: 74,
    healthTrend: -3,
    dealCount: 1,
    totalValue: 18000,
    contacts: [
      {
        id: "cnt_004",
        name: "Jamie Ortiz",
        role: "Sync Supervisor",
        interactionCount: 6,
        lastInteraction: daysAgo(1),
      },
      {
        id: "cnt_005",
        name: "Cass Nguyen",
        role: "Creative Director",
        interactionCount: 2,
        lastInteraction: daysAgo(6),
      },
    ],
    lastContact: daysAgo(1),
    currentChamber: "build",
    contractReadiness: "extraction_complete",
    latestSummary:
      "Jay Solis Netflix sync in extraction. $18K non-exclusive. Need Mia's approval on fee.",
    primaryOwnerName: "Kai Nakamura",
    pendingGateCount: 1,
  },
  {
    id: "acct_003",
    name: "Redbull Records",
    segment: "enterprise",
    healthScore: 65,
    healthTrend: -8,
    dealCount: 1,
    totalValue: 35000,
    contacts: [
      {
        id: "cnt_006",
        name: "Tomas Hale",
        role: "Brand Partnerships Lead",
        interactionCount: 4,
        lastInteraction: daysAgo(3),
      },
      {
        id: "cnt_007",
        name: "Lena Park",
        role: "Event Producer",
        interactionCount: 2,
        lastInteraction: daysAgo(7),
      },
    ],
    lastContact: daysAgo(3),
    currentChamber: "build",
    contractReadiness: "preflight_pending",
    latestSummary:
      "Portals Sound Stage deal through preflight. Waiting on brand guidelines upload. Timeline is tight.",
    primaryOwnerName: "Luna Torres",
    pendingGateCount: 1,
  },
  {
    id: "acct_004",
    name: "Boiler Room",
    segment: "mid_market",
    healthScore: 82,
    healthTrend: 2,
    dealCount: 1,
    totalValue: 5000,
    contacts: [
      {
        id: "cnt_008",
        name: "Zara Mills",
        role: "Booking Manager",
        interactionCount: 3,
        lastInteraction: daysAgo(4),
      },
      {
        id: "cnt_009",
        name: "Nico Bauer",
        role: "Content Producer",
        interactionCount: 1,
        lastInteraction: daysAgo(8),
      },
    ],
    lastContact: daysAgo(4),
    currentChamber: "discover",
    contractReadiness: "intake_pending",
    latestSummary:
      "Nova Lux Berlin set recording. Performance license in triage. SLA warning — 4 days without response.",
    primaryOwnerName: "Luna Torres",
  },
  {
    id: "acct_005",
    name: "AWAL",
    segment: "smb",
    healthScore: 91,
    healthTrend: 4,
    dealCount: 1,
    totalValue: 8000,
    contacts: [
      {
        id: "cnt_010",
        name: "River Kim",
        role: "Artist Services Rep",
        interactionCount: 10,
        lastInteraction: hoursAgo(18),
      },
    ],
    lastContact: hoursAgo(18),
    currentChamber: "review",
    contractReadiness: "gatekeeper_review",
    latestSummary:
      "Barclay Urban Fauna EP in gatekeeper review. Royalty split at 85/15 confirmed. Clean deal.",
    primaryOwnerName: "Kai Nakamura",
  },
];

// ─── Deals (Pipeline) ───────────────────────────────────────────

export const MOCK_CRM_DEALS: CrmDeal[] = [
  {
    id: "deal_001",
    accountName: "Empire Distribution",
    vaultSlug: "barclay-direct-distro",
    title: "Barclay — Direct Distribution",
    value: 120000,
    stage: "prospecting",
    assignedRep: "Luna Torres",
    taskCount: 2,
    overdueTaskCount: 0,
    daysInStage: 3,
    progressPercent: 15,
    nextTask: "Review Empire terms",
    currentChamber: "discover",
  },
  {
    id: "deal_002",
    accountName: "Empire Distribution",
    vaultSlug: "nova-lux-empire-distro",
    title: "Nova Lux — Worldwide Distribution",
    value: 50000,
    stage: "close",
    assignedRep: "Mia Okafor",
    taskCount: 1,
    overdueTaskCount: 0,
    daysInStage: 2,
    progressPercent: 95,
    nextTask: "Export finalized agreement",
  },
  {
    id: "deal_003",
    accountName: "Nettwerk Music Group",
    vaultSlug: "jay-solis-nettwerk-sync",
    title: "Jay Solis — Netflix Sync",
    value: 18000,
    stage: "negotiation",
    assignedRep: "Kai Nakamura",
    taskCount: 2,
    overdueTaskCount: 1,
    daysInStage: 5,
    progressPercent: 65,
    nextTask: "Approve sync fee",
  },
  {
    id: "deal_004",
    accountName: "Redbull Records",
    vaultSlug: "portals-redbull-stage",
    title: "The Portals — Sound Stage",
    value: 35000,
    stage: "proposal",
    assignedRep: "Luna Torres",
    taskCount: 1,
    overdueTaskCount: 0,
    daysInStage: 7,
    progressPercent: 40,
    nextTask: "Upload brand guidelines",
  },
  {
    id: "deal_005",
    accountName: "AWAL",
    vaultSlug: "barclay-awal-release",
    title: "Barclay — Urban Fauna EP",
    value: 8000,
    stage: "close",
    assignedRep: "Kai Nakamura",
    taskCount: 1,
    overdueTaskCount: 0,
    daysInStage: 1,
    progressPercent: 90,
    nextTask: "Final gatekeeper sign-off",
  },
  {
    id: "deal_006",
    accountName: "Boiler Room",
    vaultSlug: "nova-lux-boiler-room",
    title: "Nova Lux — Berlin Set Recording",
    value: 5000,
    stage: "discovery",
    assignedRep: "Luna Torres",
    taskCount: 1,
    overdueTaskCount: 1,
    daysInStage: 4,
    progressPercent: 20,
    nextTask: "Respond to performance license",
  },
];

// ─── Leads ───────────────────────────────────────────────────────

export const MOCK_CRM_LEADS: CrmLead[] = [
  {
    id: "lead_001",
    name: "Splice Sample Pack Collab",
    matchStatus: "unmatched",
    source: "web_form",
    score: 72,
    stage: "mql",
    assignedRep: "Luna Torres",
    ageDays: 8,
  },
  {
    id: "lead_002",
    name: "Toyota Commercial Sync — Jay Solis",
    matchStatus: "matched",
    source: "referral",
    score: 88,
    stage: "sql",
    assignedRep: "Kai Nakamura",
    ageDays: 3,
  },
  {
    id: "lead_003",
    name: "Coachella Booking Inquiry — The Portals",
    matchStatus: "unknown",
    source: "meeting_transcript",
    score: 45,
    stage: "new",
    assignedRep: null,
    ageDays: 1,
  },
  {
    id: "lead_004",
    name: "Pudgy Penguins Community Event",
    matchStatus: "unmatched",
    source: "web_form",
    score: 60,
    stage: "sal",
    assignedRep: "Luna Torres",
    ageDays: 5,
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
