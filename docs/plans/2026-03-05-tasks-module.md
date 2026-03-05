# Tasks Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the universal task work queue module at /tasks/ with mock data, Kanban board, sortable table, and filtered views.

**Architecture:** Mock data file defines 24 tasks spanning all modules (contracts, crm, tasks, calendar) with types, statuses, severities, role chains, vault references, and due dates. Zustand store with apiFetch/mock fallback pattern. Three view pages: Inbox (table of all open tasks), My Tasks (filtered to current user), Kanban Board (drag-and-drop status columns reusing @hello-pangea/dnd). TaskCard molecule shared between Kanban and table expansion.

**Tech Stack:** Next.js 14 App Router, Zustand, @hello-pangea/dnd (already installed), Tailwind tokens, Lucide icons.

---

## Context for Implementers

**Project vocabulary:** Vault = workflow instance, Module = top-level domain (Contracts/CRM/Tasks/Calendar/Documents), Chamber = lifecycle stage (Discover > Build > Review > Ship). DO NOT use "channel", "phase", "stage".

**Existing patterns to follow:**

- Mock data: `apps/web/src/lib/mock-crm.ts` — types + MOCK\_\* constants
- Store: `apps/web/src/stores/crm.store.ts` — Zustand with apiFetch try/mock catch
- Kanban: `apps/web/src/components/organisms/PipelineBoard.tsx` — @hello-pangea/dnd pattern
- Card: `apps/web/src/components/molecules/DealCard.tsx` — card component pattern
- Route page: `apps/web/src/app/(shell)/(modules)/crm/accounts/page.tsx` — page pattern

**Commands:**

- `source ~/.nvm/nvm.sh && nvm use 20` before any command
- `pnpm type-check` to verify TypeScript (NOT `npx tsc`)
- `pnpm lint` to verify ESLint

**Commit format:** `feat(tasks): description` with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

---

### Task 1: Mock Task Data

**Files:**

- Create: `apps/web/src/lib/mock-tasks.ts`

**What to build:**

Types and 24 mock task records spanning all modules with realistic data.

**Step 1: Create mock data file**

```typescript
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
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/lib/mock-tasks.ts
git commit -m "feat(tasks): add mock task data — 24 tasks across all modules

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Tasks Store

**Files:**

- Create: `apps/web/src/stores/tasks.store.ts`

**What to build:**

Zustand store with apiFetch/mock fallback, filter state, and moveTask action.

**Step 1: Create store**

```typescript
import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_TASKS,
  MOCK_CURRENT_USER_ID,
  type Task,
  type TaskStatus,
  type TaskSeverity,
  type TaskType,
  type ModuleType,
} from "@/lib/mock-tasks";

interface TaskFilters {
  status: TaskStatus | "all";
  severity: TaskSeverity | "all";
  taskType: TaskType | "all";
  moduleType: ModuleType | "all";
  assignedTo: string | "all" | "unassigned";
  search: string;
}

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  filters: TaskFilters;
  currentUserId: string;

  fetchTasks: () => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  setFilter: <K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K],
  ) => void;
  resetFilters: () => void;
  getFilteredTasks: () => Task[];
}

const DEFAULT_FILTERS: TaskFilters = {
  status: "all",
  severity: "all",
  taskType: "all",
  moduleType: "all",
  assignedTo: "all",
  search: "",
};

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  currentUserId: MOCK_CURRENT_USER_ID,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ tasks: Task[] }>("/api/v1/tasks");
      set({ tasks: data.tasks, isLoading: false });
    } catch {
      set({ tasks: MOCK_TASKS, isLoading: false, error: null });
    }
  },

  moveTask: (taskId, newStatus) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
          : t,
      ),
    })),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  getFilteredTasks: () => {
    const { tasks, filters } = get();
    return tasks.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.severity !== "all" && t.severity !== filters.severity)
        return false;
      if (filters.taskType !== "all" && t.taskType !== filters.taskType)
        return false;
      if (filters.moduleType !== "all" && t.moduleType !== filters.moduleType)
        return false;
      if (filters.assignedTo === "unassigned" && t.assignedTo !== null)
        return false;
      if (
        filters.assignedTo !== "all" &&
        filters.assignedTo !== "unassigned" &&
        t.assignedTo !== filters.assignedTo
      )
        return false;
      if (
        filters.search &&
        !t.title.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      return true;
    });
  },
}));
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/stores/tasks.store.ts
git commit -m "feat(tasks): add Tasks Zustand store with filters and moveTask

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: TaskCard Molecule

**Files:**

- Create: `apps/web/src/components/molecules/TaskCard.tsx`

**What to build:**

Reusable task card showing severity dot, title, module badge, vault name, assignee, due countdown. Used in Kanban columns.

**Step 1: Create component**

```tsx
"use client";

import type { Task } from "@/lib/mock-tasks";
import {
  SEVERITY_CONFIG,
  MODULE_BADGE_CONFIG,
  TASK_TYPE_LABELS,
} from "@/lib/mock-tasks";

interface TaskCardProps {
  task: Task;
}

function formatDue(
  dueAt: string | null,
): { text: string; color: string } | null {
  if (!dueAt) return null;
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 0)
    return {
      text: `${Math.abs(diffHours)}h overdue`,
      color: "text-accent-danger",
    };
  if (diffHours < 24)
    return { text: `${diffHours}h left`, color: "text-amber-400" };
  const diffDays = Math.round(diffHours / 24);
  return { text: `${diffDays}d left`, color: "text-text-muted" };
}

export default function TaskCard({ task }: TaskCardProps) {
  const severity = SEVERITY_CONFIG[task.severity];
  const moduleBadge = MODULE_BADGE_CONFIG[task.moduleType];
  const due = formatDue(task.dueAt);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3 cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-colors duration-fast">
      {/* Row 1: severity dot + title */}
      <div className="flex items-start gap-2">
        <span
          className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${severity.dotColor}`}
        />
        <span className="text-sm font-medium text-text-primary line-clamp-2">
          {task.title}
        </span>
      </div>

      {/* Row 2: module badge + type */}
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${moduleBadge.color}`}
        >
          {moduleBadge.label}
        </span>
        <span className="text-[10px] text-text-muted">
          {TASK_TYPE_LABELS[task.taskType]}
        </span>
      </div>

      {/* Row 3: vault (if present) */}
      {task.vaultSlug && (
        <div className="mt-1 text-xs text-text-muted">
          {task.vaultName || task.vaultSlug}
        </div>
      )}

      {/* Row 4: assignee + due */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-text-secondary">
          {task.assignedToName || (
            <span className="italic text-text-muted">Unassigned</span>
          )}
        </span>
        {due && (
          <span className={`font-mono text-[10px] ${due.color}`}>
            {due.text}
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/molecules/TaskCard.tsx
git commit -m "feat(tasks): add TaskCard molecule — severity, module badge, due countdown

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: TasksTable Organism

**Files:**

- Create: `apps/web/src/components/organisms/TasksTable.tsx`

**What to build:**

Sortable table with columns: Title, Module, Vault, Type, Severity, Assigned, Due, Created. Filter bar with quick filter pills and dropdown selects.

**Step 1: Create component**

```tsx
"use client";

import { useState } from "react";
import type { Task, TaskSeverity, ModuleType } from "@/lib/mock-tasks";
import {
  SEVERITY_CONFIG,
  MODULE_BADGE_CONFIG,
  TASK_TYPE_LABELS,
} from "@/lib/mock-tasks";

interface TasksTableProps {
  tasks: Task[];
  title: string;
  subtitle?: string;
  onFilterChange?: (key: string, value: string) => void;
}

type SortKey =
  | "title"
  | "moduleType"
  | "severity"
  | "status"
  | "dueAt"
  | "createdAt";
type SortDir = "asc" | "desc";

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDue(
  dueAt: string | null,
): { text: string; color: string } | null {
  if (!dueAt) return null;
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 0)
    return {
      text: `${Math.abs(diffHours)}h overdue`,
      color: "text-accent-danger font-medium",
    };
  if (diffHours < 24) return { text: `${diffHours}h`, color: "text-amber-400" };
  const diffDays = Math.round(diffHours / 24);
  return { text: `${diffDays}d`, color: "text-text-muted" };
}

const SEVERITY_ORDER: Record<TaskSeverity, number> = {
  urgent: 0,
  blocker: 1,
  warning: 2,
  info: 3,
};

const QUICK_FILTERS = [
  { label: "All", value: "all" },
  { label: "My Tasks", value: "my_tasks" },
  { label: "Unassigned", value: "unassigned" },
  { label: "Overdue", value: "overdue" },
  { label: "Blockers", value: "blockers" },
] as const;

export default function TasksTable({
  tasks,
  title,
  subtitle,
  onFilterChange,
}: TasksTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeQuickFilter, setActiveQuickFilter] = useState("all");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "title":
        return a.title.localeCompare(b.title) * dir;
      case "moduleType":
        return a.moduleType.localeCompare(b.moduleType) * dir;
      case "severity":
        return (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) * dir;
      case "status":
        return a.status.localeCompare(b.status) * dir;
      case "dueAt": {
        if (!a.dueAt && !b.dueAt) return 0;
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return (
          (new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) * dir
        );
      }
      case "createdAt":
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          dir
        );
      default:
        return 0;
    }
  });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="cursor-pointer px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text-primary"
      onClick={() => toggleSort(field)}
    >
      {label}
      {sortKey === field && (
        <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Quick filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setActiveQuickFilter(f.value);
              onFilterChange?.(f.value, f.value);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeQuickFilter === f.value
                ? "bg-accent-primary text-text-inverse"
                : "bg-surface-overlay text-text-secondary hover:bg-surface-border hover:text-text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full">
          <thead className="bg-surface-overlay">
            <tr>
              <SortHeader label="Title" field="title" />
              <SortHeader label="Module" field="moduleType" />
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Vault
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Type
              </th>
              <SortHeader label="Severity" field="severity" />
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Assigned
              </th>
              <SortHeader label="Due" field="dueAt" />
              <SortHeader label="Created" field="createdAt" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-12 text-center text-sm text-text-muted"
                >
                  No tasks match the current filters
                </td>
              </tr>
            ) : (
              sorted.map((task) => {
                const sev = SEVERITY_CONFIG[task.severity];
                const mod = MODULE_BADGE_CONFIG[task.moduleType];
                const due = formatDue(task.dueAt);

                return (
                  <tr
                    key={task.id}
                    className="transition-colors hover:bg-surface-overlay/50"
                  >
                    {/* Title */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 flex-shrink-0 rounded-full ${sev.dotColor}`}
                        />
                        <span className="text-sm text-text-primary">
                          {task.title}
                        </span>
                      </div>
                    </td>
                    {/* Module */}
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${mod.color}`}
                      >
                        {mod.label}
                      </span>
                    </td>
                    {/* Vault */}
                    <td className="px-3 py-2.5 text-xs text-text-muted">
                      {task.vaultName || "—"}
                    </td>
                    {/* Type */}
                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                      {TASK_TYPE_LABELS[task.taskType]}
                    </td>
                    {/* Severity */}
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${sev.color}`}
                      >
                        {sev.label}
                      </span>
                    </td>
                    {/* Assigned */}
                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                      {task.assignedToName || (
                        <span className="italic text-text-muted">—</span>
                      )}
                    </td>
                    {/* Due */}
                    <td className="px-3 py-2.5">
                      {due ? (
                        <span className={`font-mono text-xs ${due.color}`}>
                          {due.text}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                    {/* Created */}
                    <td className="px-3 py-2.5 text-xs text-text-muted">
                      {formatRelativeDate(task.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/TasksTable.tsx
git commit -m "feat(tasks): add TasksTable organism — sortable columns, quick filter pills

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: TasksKanban Organism

**Files:**

- Create: `apps/web/src/components/organisms/TasksKanban.tsx`

**What to build:**

4-column Kanban (Open / In Progress / In Review / Resolved) using @hello-pangea/dnd. Reuse PipelineBoard pattern.

**Step 1: Create component**

```tsx
"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  KANBAN_COLUMNS,
  TASK_STATUS_CONFIG,
  type Task,
  type TaskStatus,
} from "@/lib/mock-tasks";
import TaskCard from "@/components/molecules/TaskCard";

interface TasksKanbanProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}

export default function TasksKanban({ tasks, onMoveTask }: TasksKanbanProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;
    if (result.source.droppableId !== newStatus) {
      onMoveTask(taskId, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const statusCfg = TASK_STATUS_CONFIG[col.id];

          return (
            <div key={col.id} className="w-[300px] flex-shrink-0">
              {/* Column header */}
              <div className="mb-2 flex items-center justify-between rounded-lg bg-surface-overlay px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusCfg.color}`} />
                  <span className="text-xs font-semibold text-text-primary">
                    {col.label}
                  </span>
                  <span className="rounded-full bg-surface-border px-1.5 py-0.5 text-[10px] text-text-muted">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Droppable column */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex min-h-[200px] flex-col gap-2 rounded-lg border p-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? "border-accent-primary/40 bg-accent-primary/5"
                        : "border-surface-border-subtle bg-surface-sunken/50"
                    }`}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <TaskCard task={task} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/TasksKanban.tsx
git commit -m "feat(tasks): add TasksKanban organism — 4-column dnd board

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Inbox Page + My Tasks Page + Root Redirect

**Files:**

- Create: `apps/web/src/app/(shell)/(modules)/tasks/inbox/page.tsx`
- Create: `apps/web/src/app/(shell)/(modules)/tasks/my-tasks/page.tsx`
- Create: `apps/web/src/app/(shell)/(modules)/tasks/page.tsx`

**What to build:**

Three route pages. Inbox shows all open tasks in TasksTable. My Tasks shows tasks assigned to current user. Root redirects to /tasks/inbox.

**Step 1: Create Inbox page**

```tsx
"use client";

import { useEffect } from "react";
import { useTasksStore } from "@/stores/tasks.store";
import TasksTable from "@/components/organisms/TasksTable";

export default function TasksInboxPage() {
  const { fetchTasks, getFilteredTasks, isLoading, setFilter } =
    useTasksStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Default inbox: show non-resolved/non-dismissed tasks
  const allTasks = useTasksStore((s) => s.tasks);
  const openTasks = allTasks.filter(
    (t) => t.status !== "resolved" && t.status !== "dismissed",
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Inbox</h1>
          <p className="mt-1 text-sm text-text-secondary">
            All open tasks across every module
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/20 px-3 py-1 text-xs font-medium text-accent-primary">
          Tasks
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading tasks...</p>
        </div>
      ) : (
        <TasksTable
          tasks={openTasks}
          title="Inbox"
          subtitle={`${openTasks.length} open tasks`}
        />
      )}
    </div>
  );
}
```

**Step 2: Create My Tasks page**

```tsx
"use client";

import { useEffect } from "react";
import { useTasksStore } from "@/stores/tasks.store";
import TasksTable from "@/components/organisms/TasksTable";

export default function MyTasksPage() {
  const { fetchTasks, isLoading, currentUserId, tasks } = useTasksStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const myTasks = tasks.filter(
    (t) =>
      t.assignedTo === currentUserId &&
      t.status !== "resolved" &&
      t.status !== "dismissed",
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">My Tasks</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Tasks assigned to you
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/20 px-3 py-1 text-xs font-medium text-accent-primary">
          Tasks
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading tasks...</p>
        </div>
      ) : (
        <TasksTable
          tasks={myTasks}
          title="My Tasks"
          subtitle={`${myTasks.length} assigned to you`}
        />
      )}
    </div>
  );
}
```

**Step 3: Create root redirect page**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TasksRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tasks/inbox");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-text-muted">Loading Tasks...</span>
    </div>
  );
}
```

**Step 4: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint`
Expected: Both PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/\(shell\)/\(modules\)/tasks/
git commit -m "feat(tasks): add Inbox, My Tasks pages + root redirect

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Kanban Board Page

**Files:**

- Create: `apps/web/src/app/(shell)/(modules)/tasks/board/page.tsx`

**What to build:**

Full-width Kanban board page using TasksKanban organism with moveTask from store.

**Step 1: Create Kanban board page**

```tsx
"use client";

import { useEffect } from "react";
import { useTasksStore } from "@/stores/tasks.store";
import TasksKanban from "@/components/organisms/TasksKanban";

export default function TasksBoardPage() {
  const { fetchTasks, tasks, moveTask, isLoading } = useTasksStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Kanban Board
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Drag tasks between columns to update status
          </p>
        </div>
        <span className="rounded-full bg-chamber-build/20 px-3 py-1 text-xs font-medium text-chamber-build">
          Build
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading tasks...</p>
        </div>
      ) : (
        <TasksKanban tasks={tasks} onMoveTask={moveTask} />
      )}
    </div>
  );
}
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint`
Expected: Both PASS

**Step 3: Commit**

```bash
git add apps/web/src/app/\(shell\)/\(modules\)/tasks/board/page.tsx
git commit -m "feat(tasks): add Kanban Board page — drag-and-drop task status

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Update Component Registry + Final Verification

**Files:**

- Modify: `docs/registry/components.json`

**What to build:**

Register new components in the registry and run final verification.

**Step 1: Update component registry**

Add these entries to the components array in `docs/registry/components.json`:

```json
{
  "name": "TaskCard",
  "level": "molecule",
  "path": "apps/web/src/components/molecules/TaskCard.tsx",
  "description": "Task card with severity dot, module badge, vault name, assignee, due countdown",
  "milestone": "M11"
},
{
  "name": "TasksTable",
  "level": "organism",
  "path": "apps/web/src/components/organisms/TasksTable.tsx",
  "description": "Sortable task table with quick filter pills and column sorting",
  "milestone": "M11"
},
{
  "name": "TasksKanban",
  "level": "organism",
  "path": "apps/web/src/components/organisms/TasksKanban.tsx",
  "description": "4-column Kanban board (Open/In Progress/In Review/Resolved) with drag-and-drop",
  "milestone": "M11"
}
```

**Step 2: Run full verification**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint
```

Expected: Both PASS, zero warnings/errors.

**Step 3: Commit**

```bash
git add docs/registry/components.json
git commit -m "docs: register M11 Tasks components in registry

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Parallelization Guide

| Batch | Tasks                                      | Dependencies                                                                           |
| ----- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1     | Task 1 (mock data)                         | None — must go first                                                                   |
| 2     | Task 2 (store) + Task 3 (TaskCard)         | Both depend on Task 1 mock types, independent of each other                            |
| 3     | Task 4 (TasksTable) + Task 5 (TasksKanban) | Task 4 uses Task 1 types; Task 5 uses Task 1 + Task 3. Independent of each other.      |
| 4     | Task 6 (Inbox + My Tasks) + Task 7 (Board) | Task 6 depends on Task 2 + 4; Task 7 depends on Task 2 + 5. Independent of each other. |
| 5     | Task 8 (registry + verification)           | Depends on all above                                                                   |
