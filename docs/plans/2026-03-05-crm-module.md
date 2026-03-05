# CRM Module Implementation Plan (Phase 1)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the CRM module's core views with mock data — Accounts list, Pipeline Kanban, and New Leads table — establishing the CRM as a lens over the vault hierarchy. Phase 1 covers the 3 highest-impact views; react-admin integration deferred to when API is live.

**Architecture:** CRM routes live at `/crm/<view>`. Each view is a full-width page (like Review Queue). Mock data represents vault hierarchy levels 1-3 as accounts/contacts/deals. CRM sub-panel navigation uses the Discover/Deals/Accounts/Customers structure from the views spec. Pipeline uses `@hello-pangea/dnd` for drag-and-drop Kanban.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zustand, Tailwind (token classes only), lucide-react, @hello-pangea/dnd (Kanban)

---

## Task 1: Install @hello-pangea/dnd

**Context:** The Pipeline Kanban needs drag-and-drop. `@hello-pangea/dnd` is the maintained fork of react-beautiful-dnd.

**Step 1: Install the dependency**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app/apps/web && source ~/.nvm/nvm.sh && nvm use 20 && pnpm add @hello-pangea/dnd`

**Step 2: Verify install**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "deps(web): add @hello-pangea/dnd for CRM pipeline Kanban"
```

---

## Task 2: Mock CRM Data

**Files:**

- Create: `apps/web/src/lib/mock-crm.ts`

**Context:** Provides ALL mock data for the CRM module. Three data domains:

1. **Accounts** — Parent vaults (level 1) with health scores, deal counts, segments, contacts, hierarchy
2. **Deals** — Counterparty vaults (level 3) mapped to pipeline stages (Prospecting→Close), with value, assigned rep, tasks, age
3. **Leads** — New entities from entity resolution with source, score, stage (New→MQL→SAL→SQL), age

Entertainment industry names matching the existing vault data (Ostereo, Broke Records, etc).

**Step 1: Create the mock data file**

```typescript
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
```

**Step 2: Type-check**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/lib/mock-crm.ts
git commit -m "feat(crm): add mock CRM data — accounts, deals, leads, contacts"
```

---

## Task 3: CRM Zustand Store

**Files:**

- Create: `apps/web/src/stores/crm.store.ts`

**Context:** Follows the existing store pattern (apiFetch + mock fallback). Manages accounts, deals, leads, pipeline stage movements, and filter state.

**Step 1: Create the store**

```typescript
import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_CRM_ACCOUNTS,
  MOCK_CRM_DEALS,
  MOCK_CRM_LEADS,
  type CrmAccount,
  type CrmDeal,
  type CrmLead,
  type PipelineStage,
} from "@/lib/mock-crm";

interface CrmState {
  accounts: CrmAccount[];
  deals: CrmDeal[];
  leads: CrmLead[];
  isLoading: boolean;
  error: string | null;

  /** Fetch all CRM data */
  fetchCrmData: () => Promise<void>;
  /** Move a deal to a new pipeline stage */
  moveDeal: (dealId: string, newStage: PipelineStage) => void;
}

export const useCrmStore = create<CrmState>((set) => ({
  accounts: [],
  deals: [],
  leads: [],
  isLoading: false,
  error: null,

  fetchCrmData: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{
        accounts: CrmAccount[];
        deals: CrmDeal[];
        leads: CrmLead[];
      }>("/api/v1/crm");
      set({
        accounts: data.accounts,
        deals: data.deals,
        leads: data.leads,
        isLoading: false,
      });
    } catch {
      set({
        accounts: MOCK_CRM_ACCOUNTS,
        deals: MOCK_CRM_DEALS,
        leads: MOCK_CRM_LEADS,
        isLoading: false,
        error: null,
      });
    }
  },

  moveDeal: (dealId, newStage) =>
    set((state) => ({
      deals: state.deals.map((d) =>
        d.id === dealId ? { ...d, stage: newStage, daysInStage: 0 } : d,
      ),
    })),
}));
```

**Step 2: Type-check**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/stores/crm.store.ts
git commit -m "feat(crm): add CRM Zustand store with accounts, deals, leads"
```

---

## Task 4: DealCard Molecule

**Files:**

- Create: `apps/web/src/components/molecules/DealCard.tsx`

**Context:** The deal card rendered in the Pipeline Kanban. Shows account name, vault slug, deal value, assigned rep, task count (red if overdue), days in stage, progress bar, and next task. Matches the spec's deal card anatomy.

**Step 1: Create the component**

```typescript
"use client";

import type { CrmDeal } from "@/lib/mock-crm";

interface DealCardProps {
  deal: CrmDeal;
}

export default function DealCard({ deal }: DealCardProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3 cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-colors duration-fast">
      {/* Account + vault */}
      <div className="text-sm font-medium text-text-primary">{deal.accountName}</div>
      <div className="text-xs text-text-muted">{deal.vaultSlug}</div>

      {/* Value */}
      <div className="mt-2 text-lg font-semibold text-text-primary">
        ${deal.value.toLocaleString()}
      </div>

      {/* Rep + tasks */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-text-secondary">
          {deal.assignedRep || <span className="text-text-muted italic">Unassigned</span>}
        </span>
        <span className={deal.overdueTaskCount > 0 ? "text-accent-danger font-medium" : "text-text-muted"}>
          {deal.taskCount} task{deal.taskCount !== 1 ? "s" : ""}
          {deal.overdueTaskCount > 0 && ` (${deal.overdueTaskCount} overdue)`}
        </span>
      </div>

      {/* Stage age */}
      <div className="mt-1 text-[10px] text-text-muted">
        Stage: {deal.daysInStage}d
      </div>

      {/* Progress bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-surface-overlay overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-primary"
            style={{ width: `${deal.progressPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-text-muted">{deal.progressPercent}%</span>
      </div>

      {/* Next task */}
      {deal.nextTask && (
        <div className="mt-1.5 text-xs text-text-secondary">
          <span className="text-text-muted">Next:</span> {deal.nextTask}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Type-check**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/molecules/DealCard.tsx
git commit -m "feat(crm): add DealCard molecule — pipeline Kanban card"
```

---

## Task 5: PipelineBoard Organism

**Files:**

- Create: `apps/web/src/components/organisms/PipelineBoard.tsx`

**Context:** Kanban board with 5 columns (Prospecting→Close) using @hello-pangea/dnd. Each column shows deals as DealCard components. Column headers show stage name, count, total value. Drag-and-drop moves deals between stages. Uses the `moveDeal` action from CRM store.

**Step 1: Create the component**

```typescript
"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { PIPELINE_STAGES, type CrmDeal, type PipelineStage } from "@/lib/mock-crm";
import DealCard from "@/components/molecules/DealCard";

interface PipelineBoardProps {
  deals: CrmDeal[];
  onMoveDeal: (dealId: string, newStage: PipelineStage) => void;
}

export default function PipelineBoard({ deals, onMoveDeal }: PipelineBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId as PipelineStage;
    if (result.source.droppableId !== newStage) {
      onMoveDeal(dealId, newStage);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.id);
          const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-[280px]">
              {/* Column header */}
              <div className="mb-2 flex items-center justify-between rounded-lg bg-surface-overlay px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stage.color}`} />
                  <span className="text-xs font-semibold text-text-primary">
                    {stage.label}
                  </span>
                  <span className="rounded-full bg-surface-border px-1.5 py-0.5 text-[10px] text-text-muted">
                    {stageDeals.length}
                  </span>
                </div>
              </div>

              {/* Droppable column */}
              <Droppable droppableId={stage.id}>
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
                    {stageDeals.map((deal, index) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <DealCard deal={deal} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Column footer — total value */}
              <div className="mt-2 text-center text-xs text-text-muted">
                ${totalValue.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
```

**Step 2: Type-check**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/PipelineBoard.tsx
git commit -m "feat(crm): add PipelineBoard organism — drag-and-drop deal Kanban"
```

---

## Task 6: AccountsTable Organism

**Files:**

- Create: `apps/web/src/components/organisms/AccountsTable.tsx`

**Context:** Table of CRM accounts (Level 1 vaults). Columns: name, segment badge, health score (color-coded + trend arrow), deal count, total value, last contact (relative), contacts count. Matches the Accounts view in the spec.

**Step 1: Create the component**

```typescript
"use client";

import type { CrmAccount, AccountSegment } from "@/lib/mock-crm";
import { SEGMENT_LABELS } from "@/lib/mock-crm";

interface AccountsTableProps {
  accounts: CrmAccount[];
  onSelectAccount?: (accountId: string) => void;
}

const SEGMENT_COLORS: Record<AccountSegment, string> = {
  enterprise: "bg-chamber-review/15 text-chamber-review",
  mid_market: "bg-accent-primary/15 text-accent-primary",
  smb: "bg-accent-warning/15 text-accent-warning",
};

function healthColor(score: number): string {
  if (score >= 80) return "text-accent-success";
  if (score >= 50) return "text-accent-warning";
  return "text-accent-danger";
}

function trendArrow(trend: number): string {
  if (trend > 0) return `+${trend} ↑`;
  if (trend < 0) return `${trend} ↓`;
  return "—";
}

function trendColor(trend: number): string {
  if (trend > 0) return "text-accent-success";
  if (trend < 0) return "text-accent-danger";
  return "text-text-muted";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AccountsTable({ accounts, onSelectAccount }: AccountsTableProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-border-subtle bg-surface-overlay">
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Account</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Segment</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Health</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Deals</th>
            <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Value</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Contacts</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Last Contact</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr
              key={account.id}
              onClick={() => onSelectAccount?.(account.id)}
              className="border-b border-surface-border-subtle cursor-pointer hover:bg-surface-overlay transition-colors duration-fast"
            >
              <td className="px-4 py-3 text-sm font-medium text-text-primary">
                {account.name}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SEGMENT_COLORS[account.segment]}`}>
                  {SEGMENT_LABELS[account.segment]}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5">
                  <span className={`font-mono text-sm font-medium ${healthColor(account.healthScore)}`}>
                    {account.healthScore}
                  </span>
                  <span className={`text-[10px] ${trendColor(account.healthTrend)}`}>
                    {trendArrow(account.healthTrend)}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">{account.dealCount}</td>
              <td className="px-4 py-3 text-right text-sm font-mono text-text-primary">
                ${account.totalValue.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">{account.contacts.length}</td>
              <td className="px-4 py-3 text-xs text-text-muted">{relativeTime(account.lastContact)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Type-check**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/AccountsTable.tsx
git commit -m "feat(crm): add AccountsTable organism — vault hierarchy as CRM accounts"
```

---

## Task 7: LeadsTable Organism

**Files:**

- Create: `apps/web/src/components/organisms/LeadsTable.tsx`

**Context:** Table of CRM leads. Columns: name (+ match status), source, score (color-coded, dash if null), stage badge, assigned rep, age. Matches the New Leads view in the spec.

**Step 1: Create the component**

```typescript
"use client";

import type { CrmLead } from "@/lib/mock-crm";
import { LEAD_SOURCE_LABELS, LEAD_STAGE_CONFIG } from "@/lib/mock-crm";

interface LeadsTableProps {
  leads: CrmLead[];
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-text-muted";
  if (score >= 70) return "text-accent-success";
  if (score >= 40) return "text-accent-warning";
  return "text-accent-danger";
}

const MATCH_BADGE: Record<string, string> = {
  matched: "",
  unmatched: "text-accent-warning",
  unknown: "text-accent-danger",
};

export default function LeadsTable({ leads }: LeadsTableProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-border-subtle bg-surface-overlay">
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Lead</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Source</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Score</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Stage</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Assigned</th>
            <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Age</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const stageConfig = LEAD_STAGE_CONFIG[lead.stage];
            return (
              <tr
                key={lead.id}
                className="border-b border-surface-border-subtle cursor-pointer hover:bg-surface-overlay transition-colors duration-fast"
              >
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-text-primary">{lead.name}</div>
                  {lead.matchStatus !== "matched" && (
                    <div className={`text-[10px] ${MATCH_BADGE[lead.matchStatus]}`}>
                      ({lead.matchStatus})
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {LEAD_SOURCE_LABELS[lead.source]}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-sm ${scoreColor(lead.score)}`}>
                    {lead.score !== null ? lead.score : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-surface-base ${stageConfig.color}`}>
                    {stageConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {lead.assignedRep || <span className="text-text-muted">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-xs text-text-muted">
                  {lead.ageDays === 0 ? "Today" : `${lead.ageDays}d`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Type-check**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/LeadsTable.tsx
git commit -m "feat(crm): add LeadsTable organism — new lead triage table"
```

---

## Task 8: CRM Route Pages

**Files:**

- Create: `apps/web/src/app/(shell)/(modules)/crm/accounts/page.tsx`
- Create: `apps/web/src/app/(shell)/(modules)/crm/pipeline/page.tsx`
- Create: `apps/web/src/app/(shell)/(modules)/crm/leads/page.tsx`
- Modify: `apps/web/src/app/(shell)/(modules)/crm/[...slug]/page.tsx` (update default redirect)

**Context:** Three CRM view pages wired to the store and components. Each page calls `fetchCrmData` on mount (data is shared via the single store). The catch-all page redirects to /crm/accounts as default.

**Step 1: Create the accounts page**

`apps/web/src/app/(shell)/(modules)/crm/accounts/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useCrmStore } from "@/stores/crm.store";
import AccountsTable from "@/components/organisms/AccountsTable";

export default function CrmAccountsPage() {
  const { accounts, isLoading, fetchCrmData } = useCrmStore();

  useEffect(() => {
    fetchCrmData();
  }, [fetchCrmData]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted">Loading accounts...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Accounts</h1>
          <p className="text-xs text-text-muted">
            Vault hierarchy as CRM — {accounts.length} accounts
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-primary">
          CRM
        </span>
      </div>
      <AccountsTable accounts={accounts} />
    </div>
  );
}
```

**Step 2: Create the pipeline page**

`apps/web/src/app/(shell)/(modules)/crm/pipeline/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useCrmStore } from "@/stores/crm.store";
import PipelineBoard from "@/components/organisms/PipelineBoard";

export default function CrmPipelinePage() {
  const { deals, isLoading, fetchCrmData, moveDeal } = useCrmStore();

  useEffect(() => {
    fetchCrmData();
  }, [fetchCrmData]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted">Loading pipeline...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Pipeline</h1>
          <p className="text-xs text-text-muted">
            Deal flow across stages — {deals.length} active deals
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-primary">
          CRM
        </span>
      </div>
      <PipelineBoard deals={deals} onMoveDeal={moveDeal} />
    </div>
  );
}
```

**Step 3: Create the leads page**

`apps/web/src/app/(shell)/(modules)/crm/leads/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useCrmStore } from "@/stores/crm.store";
import LeadsTable from "@/components/organisms/LeadsTable";

export default function CrmLeadsPage() {
  const { leads, isLoading, fetchCrmData } = useCrmStore();

  useEffect(() => {
    fetchCrmData();
  }, [fetchCrmData]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted">Loading leads...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">New Leads</h1>
          <p className="text-xs text-text-muted">
            Entities from contract ingestion + inbound — {leads.length} leads
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-primary">
          CRM
        </span>
      </div>
      <LeadsTable leads={leads} />
    </div>
  );
}
```

**Step 4: Update the catch-all to redirect to accounts**

Modify `apps/web/src/app/(shell)/(modules)/crm/[...slug]/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * CRM catch-all route — redirects unknown CRM paths to /crm/accounts.
 * Will be replaced with react-admin integration when API is live.
 */
export default function CrmCatchAllPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crm/accounts");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-text-muted">Redirecting...</span>
    </div>
  );
}
```

**Step 5: Type-check + lint**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/web/src/app/\(shell\)/\(modules\)/crm/
git commit -m "feat(crm): add Accounts, Pipeline, Leads pages + catch-all redirect"
```

---

## Task 9: Final Verification + Component Registry

**Files:**

- Modify: `docs/registry/components.json`

**Step 1: Run type-check and lint**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint`
Expected: PASS (clean)

**Step 2: Update component registry**

Add these entries to the `components` array in `docs/registry/components.json`:

- `DealCard` — molecule — `src/components/molecules/DealCard.tsx`
- `PipelineBoard` — organism — `src/components/organisms/PipelineBoard.tsx`
- `AccountsTable` — organism — `src/components/organisms/AccountsTable.tsx`
- `LeadsTable` — organism — `src/components/organisms/LeadsTable.tsx`

**Step 3: Commit**

```bash
git add docs/registry/components.json
git commit -m "docs: register M10 CRM components in registry"
```

---

## Dependency Graph

```
Task 1 (dnd install) ─┐
                       ├── Task 2 (mock data) ──┬── Task 3 (store)
                       │                         ├── Task 4 (DealCard)
                       │                         ├── Task 6 (AccountsTable)
                       │                         └── Task 7 (LeadsTable)
                       │
Task 5 (PipelineBoard) ←── Task 4 (DealCard) + Task 1 (dnd)
                       │
Task 8 (pages) ←── Tasks 3 + 5 + 6 + 7
Task 9 (verify) ←── Task 8
```

**Parallelizable batches:**

- Batch 1: Task 1 + Task 2 (independent: dnd install + mock data)
- Batch 2: Tasks 3 + 4 + 6 + 7 (all depend on Task 2 types)
- Batch 3: Task 5 (depends on Task 1 dnd + Task 4 DealCard)
- Batch 4: Task 8 (depends on Tasks 3, 5, 6, 7)
- Batch 5: Task 9 (depends on Task 8)
