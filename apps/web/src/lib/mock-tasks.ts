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
  workflowName?: string;
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

// --- Date helpers ---

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 60 * 60 * 1000).toISOString();

// --- Mock tasks (8 total, music industry content) ---

export const MOCK_TASKS: Task[] = [
  {
    id: "task_001",
    title: "Review Barclay direct distribution terms",
    description:
      "Empire sent updated terms for Barclay's post-Dirtybird catalog. Compare royalty splits with the AWAL offer. Flag any exclusivity clauses.",
    taskType: "review",
    moduleType: "contracts",
    vaultSlug: "barclay-direct-distro",
    vaultName: "Barclay Crenshaw — Direct Distribution Deal",
    fieldCode: null,
    severity: "urgent",
    status: "in_progress",
    assignedTo: "user_002",
    assignedToName: "Kai Nakamura",
    createdBy: "user_self",
    createdByName: "You",
    source: "manual",
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(3),
  },
  {
    id: "task_002",
    title: "Approve Nettwerk sync placement fee",
    description:
      "Jay Solis Netflix sync — $18K for 3-year non-exclusive. Confirm rate is market standard for a series placement.",
    taskType: "approval",
    moduleType: "contracts",
    vaultSlug: "jay-solis-nettwerk-sync",
    vaultName: "Jay Solis — Nettwerk Sync License",
    fieldCode: "OPP_SYNC_FEE",
    severity: "blocker",
    status: "open",
    assignedTo: "user_003",
    assignedToName: "Mia Okafor",
    createdBy: "user_002",
    createdByName: "Kai Nakamura",
    source: "gate_check",
    dueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "task_003",
    title: "Upload Redbull brand guidelines to vault",
    description:
      "Redbull sent their 2026 brand guidelines PDF. Upload to The Portals vault before preflight can clear.",
    taskType: "action",
    moduleType: "contracts",
    vaultSlug: "portals-redbull-stage",
    vaultName: "The Portals — Redbull Sound Stage",
    fieldCode: null,
    severity: "warning",
    status: "open",
    assignedTo: "user_001",
    assignedToName: "Luna Torres",
    createdBy: "user_self",
    createdByName: "You",
    source: "manual",
    dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "task_004",
    title: "Finalize Nova Lux album art for distribution",
    description:
      "Glass Frequencies cover art needs final sign-off from Nova Lux before Empire can list on DSPs. Check dimensions match Spotify and Apple Music specs.",
    taskType: "action",
    moduleType: "documents",
    vaultSlug: "nova-lux-empire-distro",
    vaultName: "Nova Lux — Empire Worldwide Distribution",
    fieldCode: null,
    severity: "info",
    status: "resolved",
    assignedTo: "user_004",
    assignedToName: "Dex Rollins",
    createdBy: "user_003",
    createdByName: "Mia Okafor",
    source: "manual",
    dueAt: daysAgo(1),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    id: "task_005",
    title: "SLA warning: Boiler Room license response overdue",
    description:
      "Boiler Room sent the performance license 4 days ago. No response from our side. They have a hard deadline for production scheduling.",
    taskType: "sla_warning",
    moduleType: "contracts",
    vaultSlug: "nova-lux-boiler-room",
    vaultName: "Nova Lux — Boiler Room Set Recording",
    fieldCode: null,
    severity: "urgent",
    status: "open",
    assignedTo: "user_self",
    assignedToName: "You",
    createdBy: "system",
    createdByName: "System",
    source: "sla_monitor",
    dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(6),
  },
  {
    id: "task_006",
    title: "Schedule Jay Solis listening session",
    description:
      "Jay wants to preview Midnight Concrete LP with Dex and the team before the producer agreement ships. Find a 2-hour block this week.",
    taskType: "manual",
    moduleType: "calendar",
    vaultSlug: "jay-solis-producer-agreement",
    vaultName: "Jay Solis — Producer Agreement (Dex Rollins)",
    fieldCode: null,
    severity: "info",
    status: "in_progress",
    assignedTo: "user_001",
    assignedToName: "Luna Torres",
    createdBy: "user_self",
    createdByName: "You",
    source: "manual",
    dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(12),
  },
  {
    id: "task_007",
    title: "Follow up with Pudgy Penguins re: community event",
    description:
      "Inbound lead from Pudgy Penguins team about a community listening party. They want an artist from our roster. Reply within 48 hours.",
    taskType: "deal_task",
    moduleType: "crm",
    vaultSlug: null,
    vaultName: null,
    fieldCode: null,
    severity: "warning",
    status: "open",
    assignedTo: "user_self",
    assignedToName: "You",
    createdBy: "user_001",
    createdByName: "Luna Torres",
    source: "crm_lead",
    dueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "task_008",
    title: "Review AWAL royalty reporting discrepancy",
    description:
      "Barclay flagged a $2,400 discrepancy in Q1 streaming royalties from AWAL. Pull the statement and compare against our internal projections.",
    taskType: "triage",
    moduleType: "contracts",
    vaultSlug: "barclay-awal-release",
    vaultName: "Barclay Crenshaw — AWAL Digital Release",
    fieldCode: "OPP_ROYALTY_SPLIT",
    severity: "warning",
    status: "in_review",
    assignedTo: "user_002",
    assignedToName: "Kai Nakamura",
    createdBy: "user_self",
    createdByName: "You",
    source: "manual",
    dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(8),
  },
];
