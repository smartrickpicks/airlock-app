/**
 * Mock Tasks data — universal task table.
 * Every module generates tasks; the Tasks module shows ALL of them.
 * Remove this file once the API + Postgres are available.
 */

// --- Types ---

export type TaskStatus =
  | "open"
  | "in_progress"
  | "in_review"
  | "resolved"
  | "dismissed";

export type TaskType =
  | "triage"
  | "review"
  | "approval"
  | "action"
  | "sla_warning"
  | "entity_resolution"
  | "manual"
  | "deal_task"
  | "onboarding";

export type TaskSeverity = "info" | "warning" | "blocker" | "urgent";

export type ModuleType =
  | "contracts"
  | "crm"
  | "tasks"
  | "calendar"
  | "documents";

export interface Task {
  id: string;
  title: string;
  description: string;
  taskType: TaskType;
  moduleType: ModuleType;
  vaultSlug: string | null;
  vaultName: string | null;
  fieldCode: string | null;
  severity: TaskSeverity;
  status: TaskStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  createdBy: string;
  createdByName: string;
  source: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Config maps ---

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "bg-gate-red" },
  in_progress: { label: "In Progress", color: "bg-gate-yellow" },
  in_review: { label: "In Review", color: "bg-gate-purple" },
  resolved: { label: "Resolved", color: "bg-gate-green" },
  dismissed: { label: "Dismissed", color: "bg-surface-border" },
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  triage: "Triage",
  review: "Review",
  approval: "Approval",
  action: "Action",
  sla_warning: "SLA Warning",
  entity_resolution: "Entity Resolution",
  manual: "Manual",
  deal_task: "Deal Task",
  onboarding: "Onboarding",
};

export const SEVERITY_CONFIG: Record<
  TaskSeverity,
  { label: string; color: string; dotColor: string }
> = {
  info: {
    label: "Info",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
  },
  warning: {
    label: "Warning",
    color: "bg-amber-500/20 text-amber-400",
    dotColor: "bg-amber-400",
  },
  blocker: {
    label: "Blocker",
    color: "bg-accent-danger/20 text-accent-danger",
    dotColor: "bg-accent-danger",
  },
  urgent: {
    label: "Urgent",
    color: "bg-red-500/20 text-red-300",
    dotColor: "bg-red-400",
  },
};

export const MODULE_BADGE_CONFIG: Record<
  ModuleType,
  { label: string; color: string }
> = {
  contracts: {
    label: "Contracts",
    color: "bg-chamber-discover/20 text-chamber-discover",
  },
  crm: { label: "CRM", color: "bg-accent-primary/20 text-accent-primary" },
  tasks: {
    label: "Tasks",
    color: "bg-accent-secondary/20 text-accent-secondary",
  },
  calendar: {
    label: "Calendar",
    color: "bg-chamber-ship/20 text-chamber-ship",
  },
  documents: { label: "Documents", color: "bg-purple-500/20 text-purple-400" },
};

export const KANBAN_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "resolved", label: "Resolved" },
];

// --- Mock users (reuse across tasks) ---

export const MOCK_TASK_USERS = [
  { id: "user_001", name: "Ana Chen" },
  { id: "user_002", name: "David Park" },
  { id: "user_003", name: "Sarah Miller" },
] as const;

// Current user for "My Tasks" filtering
export const MOCK_CURRENT_USER_ID = "user_001";

// --- Mock tasks (24 total, spanning all modules) ---

export const MOCK_TASKS: Task[] = [
  // Contracts — triage (6)
  {
    id: "task_001",
    title: "Missing indemnification cap amount",
    description:
      "Section 8.2 references liability cap but no dollar amount specified.",
    taskType: "triage",
    moduleType: "contracts",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    fieldCode: "OPP_INDEMNIFICATION_CAP",
    severity: "blocker",
    status: "open",
    assignedTo: "user_001",
    assignedToName: "Ana Chen",
    createdBy: "system",
    createdByName: "System",
    source: "preflight",
    dueAt: "2026-03-06T17:00:00Z",
    createdAt: "2026-03-04T10:30:00Z",
    updatedAt: "2026-03-04T10:30:00Z",
  },
  {
    id: "task_002",
    title: "Low confidence: territory field",
    description: "Extraction confidence 42% for OPP_TERRITORY.",
    taskType: "triage",
    moduleType: "contracts",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    fieldCode: "OPP_TERRITORY",
    severity: "warning",
    status: "open",
    assignedTo: "user_001",
    assignedToName: "Ana Chen",
    createdBy: "system",
    createdByName: "System",
    source: "extraction",
    dueAt: null,
    createdAt: "2026-03-04T11:00:00Z",
    updatedAt: "2026-03-04T11:00:00Z",
  },
  {
    id: "task_003",
    title: "Entity resolution: Summit Media",
    description:
      "Ambiguous entity detected — multiple matches in vault hierarchy.",
    taskType: "entity_resolution",
    moduleType: "contracts",
    vaultSlug: "summit-dist",
    vaultName: "Summit Distribution",
    fieldCode: null,
    severity: "warning",
    status: "in_progress",
    assignedTo: "user_003",
    assignedToName: "Sarah Miller",
    createdBy: "system",
    createdByName: "System",
    source: "extraction",
    dueAt: "2026-03-07T12:00:00Z",
    createdAt: "2026-03-03T14:00:00Z",
    updatedAt: "2026-03-05T09:00:00Z",
  },
  {
    id: "task_004",
    title: "Review patch: effective date correction",
    description: "Patch submitted for OPP_EFFECTIVE_DATE on Nova contract.",
    taskType: "approval",
    moduleType: "contracts",
    vaultSlug: "nova-msa",
    vaultName: "Nova Entertainment MSA",
    fieldCode: "OPP_EFFECTIVE_DATE",
    severity: "info",
    status: "in_review",
    assignedTo: "user_002",
    assignedToName: "David Park",
    createdBy: "user_001",
    createdByName: "Ana Chen",
    source: "patch_workflow",
    dueAt: "2026-03-06T09:00:00Z",
    createdAt: "2026-03-04T16:00:00Z",
    updatedAt: "2026-03-05T08:00:00Z",
  },
  {
    id: "task_005",
    title: "Gate review: TechFlow preflight",
    description: "TechFlow Inc vault ready for Discover gate review.",
    taskType: "review",
    moduleType: "contracts",
    vaultSlug: "techflow-nda",
    vaultName: "TechFlow NDA",
    fieldCode: null,
    severity: "info",
    status: "open",
    assignedTo: "user_002",
    assignedToName: "David Park",
    createdBy: "system",
    createdByName: "System",
    source: "gate_check",
    dueAt: "2026-03-08T17:00:00Z",
    createdAt: "2026-03-05T07:00:00Z",
    updatedAt: "2026-03-05T07:00:00Z",
  },
  {
    id: "task_006",
    title: "SLA warning: Ostereo review overdue",
    description: "Review SLA breached by 4 hours.",
    taskType: "sla_warning",
    moduleType: "contracts",
    vaultSlug: "ostereo-msa",
    vaultName: "Ostereo Music MSA",
    fieldCode: null,
    severity: "urgent",
    status: "open",
    assignedTo: "user_002",
    assignedToName: "David Park",
    createdBy: "system",
    createdByName: "System",
    source: "sla_engine",
    dueAt: "2026-03-05T13:00:00Z",
    createdAt: "2026-03-05T13:00:00Z",
    updatedAt: "2026-03-05T13:00:00Z",
  },
  // CRM — deal tasks + leads (6)
  {
    id: "task_007",
    title: "Send proposal to Nova Entertainment",
    description: "Draft and send formal proposal for Henderson expansion.",
    taskType: "deal_task",
    moduleType: "crm",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    fieldCode: null,
    severity: "warning",
    status: "open",
    assignedTo: "user_003",
    assignedToName: "Sarah Miller",
    createdBy: "system",
    createdByName: "System",
    source: "stage_rule",
    dueAt: "2026-03-10T17:00:00Z",
    createdAt: "2026-03-04T09:00:00Z",
    updatedAt: "2026-03-04T09:00:00Z",
  },
  {
    id: "task_008",
    title: "Qualify lead: TechFlow Inc",
    description: "New lead from contract upload — needs qualification.",
    taskType: "action",
    moduleType: "crm",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "info",
    status: "open",
    assignedTo: null,
    assignedToName: null,
    createdBy: "system",
    createdByName: "System",
    source: "entity_resolution",
    dueAt: null,
    createdAt: "2026-03-05T08:00:00Z",
    updatedAt: "2026-03-05T08:00:00Z",
  },
  {
    id: "task_009",
    title: "Follow up: Summit Media renewal",
    description: "Renewal due in 11 days — schedule call.",
    taskType: "deal_task",
    moduleType: "crm",
    vaultSlug: "summit-dist",
    vaultName: "Summit Distribution",
    fieldCode: null,
    severity: "warning",
    status: "in_progress",
    assignedTo: "user_003",
    assignedToName: "Sarah Miller",
    createdBy: "system",
    createdByName: "System",
    source: "sla_engine",
    dueAt: "2026-03-08T17:00:00Z",
    createdAt: "2026-03-03T10:00:00Z",
    updatedAt: "2026-03-05T11:00:00Z",
  },
  {
    id: "task_010",
    title: "Enrich account: Pinnacle Partners",
    description: "Entity resolution identified new potential account.",
    taskType: "entity_resolution",
    moduleType: "crm",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "info",
    status: "open",
    assignedTo: "user_001",
    assignedToName: "Ana Chen",
    createdBy: "system",
    createdByName: "System",
    source: "entity_resolution",
    dueAt: null,
    createdAt: "2026-03-04T15:00:00Z",
    updatedAt: "2026-03-04T15:00:00Z",
  },
  {
    id: "task_011",
    title: "Schedule discovery call: MediaWorks",
    description: "MQL lead accepted — needs discovery call.",
    taskType: "deal_task",
    moduleType: "crm",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "info",
    status: "in_progress",
    assignedTo: "user_001",
    assignedToName: "Ana Chen",
    createdBy: "user_001",
    createdByName: "Ana Chen",
    source: "manual",
    dueAt: "2026-03-07T17:00:00Z",
    createdAt: "2026-03-04T13:00:00Z",
    updatedAt: "2026-03-05T10:00:00Z",
  },
  {
    id: "task_012",
    title: "Update CRM: Ostereo deal close",
    description: "Ostereo verbal agreement confirmed — update deal stage.",
    taskType: "action",
    moduleType: "crm",
    vaultSlug: "ostereo-msa",
    vaultName: "Ostereo Music MSA",
    fieldCode: null,
    severity: "info",
    status: "resolved",
    assignedTo: "user_003",
    assignedToName: "Sarah Miller",
    createdBy: "system",
    createdByName: "System",
    source: "cross_module",
    dueAt: "2026-03-05T12:00:00Z",
    createdAt: "2026-03-04T16:00:00Z",
    updatedAt: "2026-03-05T11:30:00Z",
  },
  // Tasks module — manual tasks (6)
  {
    id: "task_013",
    title: "Review Q1 contract report",
    description: "Compile and review quarterly contract metrics.",
    taskType: "manual",
    moduleType: "tasks",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "info",
    status: "open",
    assignedTo: "user_002",
    assignedToName: "David Park",
    createdBy: "user_002",
    createdByName: "David Park",
    source: "manual",
    dueAt: "2026-03-12T17:00:00Z",
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "task_014",
    title: "Update team onboarding docs",
    description: "Refresh onboarding documentation for new hires.",
    taskType: "manual",
    moduleType: "tasks",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "info",
    status: "in_progress",
    assignedTo: "user_001",
    assignedToName: "Ana Chen",
    createdBy: "user_001",
    createdByName: "Ana Chen",
    source: "manual",
    dueAt: "2026-03-14T17:00:00Z",
    createdAt: "2026-03-02T10:00:00Z",
    updatedAt: "2026-03-04T14:00:00Z",
  },
  {
    id: "task_015",
    title: "Prepare extraction config for Warner",
    description: "Set up field extraction rules for Warner Bros contract type.",
    taskType: "manual",
    moduleType: "tasks",
    vaultSlug: "warner-amend",
    vaultName: "Warner Amendment",
    fieldCode: null,
    severity: "warning",
    status: "open",
    assignedTo: "user_001",
    assignedToName: "Ana Chen",
    createdBy: "user_003",
    createdByName: "Sarah Miller",
    source: "manual",
    dueAt: "2026-03-09T17:00:00Z",
    createdAt: "2026-03-03T11:00:00Z",
    updatedAt: "2026-03-03T11:00:00Z",
  },
  {
    id: "task_016",
    title: "Configure preflight rules for NDA",
    description: "Add preflight quality gates for the NDA contract type.",
    taskType: "manual",
    moduleType: "tasks",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "info",
    status: "open",
    assignedTo: "user_002",
    assignedToName: "David Park",
    createdBy: "user_002",
    createdByName: "David Park",
    source: "manual",
    dueAt: null,
    createdAt: "2026-03-04T08:00:00Z",
    updatedAt: "2026-03-04T08:00:00Z",
  },
  {
    id: "task_017",
    title: "Team sync: sprint retrospective",
    description: "Facilitate sprint retro for the contracts team.",
    taskType: "manual",
    moduleType: "tasks",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "info",
    status: "resolved",
    assignedTo: "user_003",
    assignedToName: "Sarah Miller",
    createdBy: "user_003",
    createdByName: "Sarah Miller",
    source: "manual",
    dueAt: "2026-03-04T15:00:00Z",
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-04T16:00:00Z",
  },
  {
    id: "task_018",
    title: "Draft SLA policy document",
    description: "Create SLA escalation policy for review workflows.",
    taskType: "manual",
    moduleType: "tasks",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "warning",
    status: "in_review",
    assignedTo: "user_001",
    assignedToName: "Ana Chen",
    createdBy: "user_001",
    createdByName: "Ana Chen",
    source: "manual",
    dueAt: "2026-03-06T17:00:00Z",
    createdAt: "2026-03-02T14:00:00Z",
    updatedAt: "2026-03-05T09:30:00Z",
  },
  // Calendar — date-driven tasks (3)
  {
    id: "task_019",
    title: "Henderson MSA renewal deadline",
    description: "Contract renewal due — initiate renewal process.",
    taskType: "action",
    moduleType: "calendar",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    fieldCode: null,
    severity: "warning",
    status: "open",
    assignedTo: "user_003",
    assignedToName: "Sarah Miller",
    createdBy: "system",
    createdByName: "System",
    source: "extraction",
    dueAt: "2026-03-15T17:00:00Z",
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
  {
    id: "task_020",
    title: "Summit Media contract expiry",
    description: "Distribution agreement expires — renew or close.",
    taskType: "action",
    moduleType: "calendar",
    vaultSlug: "summit-dist",
    vaultName: "Summit Distribution",
    fieldCode: null,
    severity: "blocker",
    status: "open",
    assignedTo: "user_003",
    assignedToName: "Sarah Miller",
    createdBy: "system",
    createdByName: "System",
    source: "extraction",
    dueAt: "2026-04-01T17:00:00Z",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "task_021",
    title: "Quarterly compliance review",
    description: "Scheduled compliance review for all active contracts.",
    taskType: "manual",
    moduleType: "calendar",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "info",
    status: "open",
    assignedTo: "user_002",
    assignedToName: "David Park",
    createdBy: "user_002",
    createdByName: "David Park",
    source: "manual",
    dueAt: "2026-03-31T17:00:00Z",
    createdAt: "2026-03-01T08:00:00Z",
    updatedAt: "2026-03-01T08:00:00Z",
  },
  // Onboarding tasks (3) — cross-module from contract shipped
  {
    id: "task_022",
    title: "Onboard Acme Inc: create account",
    description: "Set up Acme Inc account in CRM after contract shipped.",
    taskType: "onboarding",
    moduleType: "crm",
    vaultSlug: "acme-msa",
    vaultName: "Acme Inc MSA",
    fieldCode: null,
    severity: "info",
    status: "resolved",
    assignedTo: "user_001",
    assignedToName: "Ana Chen",
    createdBy: "system",
    createdByName: "System",
    source: "cross_module",
    dueAt: "2026-03-03T17:00:00Z",
    createdAt: "2026-03-02T10:00:00Z",
    updatedAt: "2026-03-03T11:00:00Z",
  },
  {
    id: "task_023",
    title: "Onboard Acme Inc: provision Smart Line",
    description: "Provision dedicated phone number for Acme communications.",
    taskType: "onboarding",
    moduleType: "crm",
    vaultSlug: "acme-msa",
    vaultName: "Acme Inc MSA",
    fieldCode: null,
    severity: "info",
    status: "resolved",
    assignedTo: null,
    assignedToName: null,
    createdBy: "system",
    createdByName: "System",
    source: "cross_module",
    dueAt: "2026-03-03T17:00:00Z",
    createdAt: "2026-03-02T10:00:00Z",
    updatedAt: "2026-03-02T10:05:00Z",
  },
  {
    id: "task_024",
    title: "Onboard Acme Inc: schedule kickoff",
    description: "Schedule kickoff call with Acme Inc stakeholders.",
    taskType: "onboarding",
    moduleType: "crm",
    vaultSlug: "acme-msa",
    vaultName: "Acme Inc MSA",
    fieldCode: null,
    severity: "info",
    status: "open",
    assignedTo: "user_003",
    assignedToName: "Sarah Miller",
    createdBy: "system",
    createdByName: "System",
    source: "cross_module",
    dueAt: "2026-03-07T17:00:00Z",
    createdAt: "2026-03-02T10:00:00Z",
    updatedAt: "2026-03-02T10:00:00Z",
  },
];
