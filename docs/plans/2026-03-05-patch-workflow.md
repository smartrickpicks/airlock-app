# Patch Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the patch data correction workflow UI — state machine, approval chain timeline, SLA timer, patch list, simplified editor form, and wire into the Control panel tabs.

**Architecture:** Patches are data correction proposals with 12 lifecycle states and 20 transitions. The UI uses mock data with API-first + fallback pattern (same as extraction store). The approval chain renders as a vertical dot timeline in the Control panel's "Approvals" tab, and the SLA timer renders in the "SLA" tab. Action Focus mode (triptych view state) hosts the patch editor.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Zustand, Tailwind CSS tokens, Lucide icons

---

## Context for Implementers

### Vocabulary

- **Patch** — A data correction proposal for contract fields
- **Vault** — The workflow instance a patch belongs to
- **Chamber** — Lifecycle stage (Discover > Build > Review > Ship)
- **Triptych** — Three-panel layout (Signal | Orchestrate | Control)
- **Action Focus** — A triptych view state where Signal collapses and Orchestrate splits into editor + preview

### Existing Patterns

- **Mock data pattern:** `src/lib/mock-*.ts` exports typed data + `MOCK_*` keyed by vault_id
- **Store pattern:** `src/stores/*.store.ts` — Zustand stores with `apiFetch` + mock fallback in `catch`
- **Atom pattern:** PascalCase `.tsx` in `src/components/atoms/`, one default export, Tailwind tokens only
- **Molecule pattern:** `src/components/molecules/`, `'use client'` if hooks used
- **Organism pattern:** `src/components/organisms/`, `'use client'` for stateful components
- **Control panel:** `src/components/organisms/ControlPanel.tsx` renders tab content by `activeTab` key — currently all placeholder text

### Key Files to Reference

- `src/stores/extraction.store.ts` — API + mock fallback pattern to follow
- `src/stores/triptych.store.ts` — `setViewState("action-focus")` already exists
- `src/components/organisms/ControlPanel.tsx` — Tab system to wire into
- `src/stores/auth.store.ts` — `user.id` for self-approval prevention

### Commands

- **Lint:** `source ~/.nvm/nvm.sh && nvm use 20 && npx eslint src/ --ext .ts,.tsx`
- **Type-check:** `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
- **Dev server:** `source ~/.nvm/nvm.sh && nvm use 20 && pnpm dev`

---

### Task 1: Patch Types + Mock Data

**Files:**

- Create: `apps/web/src/lib/mock-patches.ts`

**Step 1: Create the patch types and mock data file**

This file defines all patch-related types (mirroring the spec's 12 states and 20 transitions) and provides deterministic mock patch data for two vaults.

```typescript
/**
 * Mock patch data for dev preview.
 * Models the 12-state patch lifecycle from the Patch Workflow spec.
 */

export type PatchState =
  | "draft"
  | "submitted"
  | "needs_clarification"
  | "verifier_responded"
  | "verifier_approved"
  | "admin_hold"
  | "admin_approved"
  | "applied"
  | "rejected"
  | "cancelled"
  | "sent_to_otto"
  | "otto_returned";

export type ApprovalStepStatus =
  | "completed"
  | "active"
  | "pending"
  | "rejected"
  | "returned";

export interface PatchTransition {
  from: PatchState;
  to: PatchState;
  actor_id: string;
  actor_name: string;
  timestamp: string;
  note?: string;
}

export interface ApprovalStep {
  id: string;
  label: string;
  status: ApprovalStepStatus;
  actor_name: string | null;
  role: "author" | "verifier" | "admin" | "system";
  timestamp: string | null;
  sla_deadline: string | null;
  note?: string;
}

export interface Patch {
  id: string;
  vault_id: string;
  author_id: string;
  author_name: string;
  state: PatchState;
  version: number;
  field_name: string;
  current_value: string;
  proposed_value: string;
  intent: string;
  because_clause: string;
  history: PatchTransition[];
  approval_steps: ApprovalStep[];
  sla_deadline: string | null;
  created_at: string;
  updated_at: string;
}

/** Valid state transitions with required roles */
export const VALID_TRANSITIONS: {
  from: PatchState;
  to: PatchState;
  role: "author" | "verifier" | "admin" | "system";
}[] = [
  { from: "draft", to: "submitted", role: "author" },
  { from: "draft", to: "cancelled", role: "author" },
  { from: "submitted", to: "needs_clarification", role: "verifier" },
  { from: "submitted", to: "verifier_approved", role: "verifier" },
  { from: "submitted", to: "rejected", role: "verifier" },
  { from: "needs_clarification", to: "verifier_responded", role: "author" },
  { from: "needs_clarification", to: "cancelled", role: "author" },
  { from: "verifier_responded", to: "verifier_approved", role: "verifier" },
  { from: "verifier_responded", to: "needs_clarification", role: "verifier" },
  { from: "verifier_responded", to: "rejected", role: "verifier" },
  { from: "verifier_approved", to: "admin_approved", role: "admin" },
  { from: "verifier_approved", to: "admin_hold", role: "admin" },
  { from: "verifier_approved", to: "rejected", role: "admin" },
  { from: "admin_hold", to: "admin_approved", role: "admin" },
  { from: "admin_hold", to: "rejected", role: "admin" },
  { from: "admin_approved", to: "applied", role: "system" },
  { from: "admin_approved", to: "sent_to_otto", role: "admin" },
  { from: "sent_to_otto", to: "otto_returned", role: "system" },
  { from: "otto_returned", to: "admin_approved", role: "admin" },
  { from: "otto_returned", to: "rejected", role: "admin" },
];

/** Human-readable state labels */
export const STATE_LABELS: Record<PatchState, string> = {
  draft: "Draft",
  submitted: "Submitted",
  needs_clarification: "Needs Clarification",
  verifier_responded: "Verifier Responded",
  verifier_approved: "Verifier Approved",
  admin_hold: "Admin Hold",
  admin_approved: "Admin Approved",
  applied: "Applied",
  rejected: "Rejected",
  cancelled: "Cancelled",
  sent_to_otto: "Sent to Otto",
  otto_returned: "Otto Returned",
};

/** State category for color-coding */
export function stateCategory(
  state: PatchState,
): "active" | "success" | "danger" | "neutral" | "warning" {
  switch (state) {
    case "draft":
    case "submitted":
    case "needs_clarification":
    case "verifier_responded":
    case "sent_to_otto":
    case "otto_returned":
      return "active";
    case "verifier_approved":
    case "admin_approved":
      return "warning";
    case "applied":
      return "success";
    case "rejected":
      return "danger";
    case "cancelled":
    case "admin_hold":
      return "neutral";
  }
}

const MOCK_PATCHES_LIST: Patch[] = [
  {
    id: "patch_001",
    vault_id: "vault_004",
    author_id: "user_001",
    author_name: "Jane Builder",
    state: "verifier_approved",
    version: 3,
    field_name: "Territory",
    current_value: "Worldwide",
    proposed_value: "North America, Europe",
    intent: "Narrow territory scope to exclude APAC markets per client request",
    because_clause:
      "The licensor has existing distribution agreements in APAC territories through a separate deal with Universal. Including Worldwide would create a conflict with Section 4.2 of the existing Universal agreement dated 2024-09-01.",
    history: [
      {
        from: "draft",
        to: "submitted",
        actor_id: "user_001",
        actor_name: "Jane Builder",
        timestamp: "2026-02-28T10:15:00Z",
      },
      {
        from: "submitted",
        to: "verifier_approved",
        actor_id: "user_002",
        actor_name: "Tom Gatekeeper",
        timestamp: "2026-02-28T14:30:00Z",
        note: "Territory change verified against Universal deal terms.",
      },
    ],
    approval_steps: [
      {
        id: "step_001",
        label: "Submitted",
        status: "completed",
        actor_name: "Jane Builder",
        role: "author",
        timestamp: "2026-02-28T10:15:00Z",
        sla_deadline: null,
      },
      {
        id: "step_002",
        label: "Verifier Review",
        status: "completed",
        actor_name: "Tom Gatekeeper",
        role: "verifier",
        timestamp: "2026-02-28T14:30:00Z",
        sla_deadline: null,
        note: "Territory change verified against Universal deal terms.",
      },
      {
        id: "step_003",
        label: "Admin Review",
        status: "active",
        actor_name: "Sarah Owner",
        role: "admin",
        timestamp: null,
        sla_deadline: "2026-03-05T18:00:00Z",
      },
      {
        id: "step_004",
        label: "Applied",
        status: "pending",
        actor_name: null,
        role: "system",
        timestamp: null,
        sla_deadline: null,
      },
    ],
    sla_deadline: "2026-03-05T18:00:00Z",
    created_at: "2026-02-28T09:00:00Z",
    updated_at: "2026-02-28T14:30:00Z",
  },
  {
    id: "patch_002",
    vault_id: "vault_004",
    author_id: "user_001",
    author_name: "Jane Builder",
    state: "needs_clarification",
    version: 2,
    field_name: "Distribution Fee",
    current_value: "15%",
    proposed_value: "12%",
    intent:
      "Reduce distribution fee to match industry standard for digital-only",
    because_clause:
      "Industry benchmarks for digital-only distribution (no physical) typically range from 10-14%. The current 15% rate was set when physical distribution was included. Since physical was dropped in Amendment 2, the fee should be adjusted accordingly.",
    history: [
      {
        from: "draft",
        to: "submitted",
        actor_id: "user_001",
        actor_name: "Jane Builder",
        timestamp: "2026-03-01T11:00:00Z",
      },
      {
        from: "submitted",
        to: "needs_clarification",
        actor_id: "user_002",
        actor_name: "Tom Gatekeeper",
        timestamp: "2026-03-01T16:45:00Z",
        note: "Please provide the Amendment 2 reference and confirm the effective date of physical distribution removal.",
      },
    ],
    approval_steps: [
      {
        id: "step_005",
        label: "Submitted",
        status: "completed",
        actor_name: "Jane Builder",
        role: "author",
        timestamp: "2026-03-01T11:00:00Z",
        sla_deadline: null,
      },
      {
        id: "step_006",
        label: "Verifier Review",
        status: "returned",
        actor_name: "Tom Gatekeeper",
        role: "verifier",
        timestamp: "2026-03-01T16:45:00Z",
        sla_deadline: null,
        note: "Please provide the Amendment 2 reference and confirm the effective date of physical distribution removal.",
      },
      {
        id: "step_007",
        label: "Admin Review",
        status: "pending",
        actor_name: null,
        role: "admin",
        timestamp: null,
        sla_deadline: null,
      },
      {
        id: "step_008",
        label: "Applied",
        status: "pending",
        actor_name: null,
        role: "system",
        timestamp: null,
        sla_deadline: null,
      },
    ],
    sla_deadline: null,
    created_at: "2026-03-01T10:30:00Z",
    updated_at: "2026-03-01T16:45:00Z",
  },
  {
    id: "patch_003",
    vault_id: "vault_004",
    author_id: "user_003",
    author_name: "Sarah Owner",
    state: "applied",
    version: 4,
    field_name: "Payment Terms",
    current_value: "Net 60",
    proposed_value: "Net 45",
    intent: "Shorten payment window per new corporate policy",
    because_clause:
      "Corporate treasury has mandated Net 45 for all new and renewed distribution agreements effective 2026-01-01. This vault's contract predates the policy but is being renewed, so it must comply.",
    history: [
      {
        from: "draft",
        to: "submitted",
        actor_id: "user_003",
        actor_name: "Sarah Owner",
        timestamp: "2026-02-15T08:00:00Z",
      },
      {
        from: "submitted",
        to: "verifier_approved",
        actor_id: "user_002",
        actor_name: "Tom Gatekeeper",
        timestamp: "2026-02-15T12:00:00Z",
      },
      {
        from: "verifier_approved",
        to: "admin_approved",
        actor_id: "user_004",
        actor_name: "Mike Director",
        timestamp: "2026-02-16T09:00:00Z",
      },
      {
        from: "admin_approved",
        to: "applied",
        actor_id: "system",
        actor_name: "System",
        timestamp: "2026-02-16T09:00:30Z",
      },
    ],
    approval_steps: [
      {
        id: "step_009",
        label: "Submitted",
        status: "completed",
        actor_name: "Sarah Owner",
        role: "author",
        timestamp: "2026-02-15T08:00:00Z",
        sla_deadline: null,
      },
      {
        id: "step_010",
        label: "Verifier Review",
        status: "completed",
        actor_name: "Tom Gatekeeper",
        role: "verifier",
        timestamp: "2026-02-15T12:00:00Z",
        sla_deadline: null,
      },
      {
        id: "step_011",
        label: "Admin Review",
        status: "completed",
        actor_name: "Mike Director",
        role: "admin",
        timestamp: "2026-02-16T09:00:00Z",
        sla_deadline: null,
      },
      {
        id: "step_012",
        label: "Applied",
        status: "completed",
        actor_name: "System",
        role: "system",
        timestamp: "2026-02-16T09:00:30Z",
        sla_deadline: null,
      },
    ],
    sla_deadline: null,
    created_at: "2026-02-14T17:00:00Z",
    updated_at: "2026-02-16T09:00:30Z",
  },
  {
    id: "patch_004",
    vault_id: "vault_004",
    author_id: "user_001",
    author_name: "Jane Builder",
    state: "draft",
    version: 1,
    field_name: "Minimum Guarantee",
    current_value: "$500,000",
    proposed_value: "$450,000",
    intent: "Adjust minimum guarantee to reflect reduced territory scope",
    because_clause:
      "With territory narrowed from Worldwide to NA+EU (see patch_001), the minimum guarantee should be proportionally reduced. NA+EU represents approximately 90% of projected revenue.",
    history: [],
    approval_steps: [
      {
        id: "step_013",
        label: "Submitted",
        status: "pending",
        actor_name: null,
        role: "author",
        timestamp: null,
        sla_deadline: null,
      },
      {
        id: "step_014",
        label: "Verifier Review",
        status: "pending",
        actor_name: null,
        role: "verifier",
        timestamp: null,
        sla_deadline: null,
      },
      {
        id: "step_015",
        label: "Admin Review",
        status: "pending",
        actor_name: null,
        role: "admin",
        timestamp: null,
        sla_deadline: null,
      },
      {
        id: "step_016",
        label: "Applied",
        status: "pending",
        actor_name: null,
        role: "system",
        timestamp: null,
        sla_deadline: null,
      },
    ],
    sla_deadline: null,
    created_at: "2026-03-05T08:00:00Z",
    updated_at: "2026-03-05T08:00:00Z",
  },
];

export const MOCK_PATCHES: Record<string, Patch[]> = {
  vault_004: MOCK_PATCHES_LIST.filter((p) => p.vault_id === "vault_004"),
  vault_006: [],
};
```

**Step 2: Run type-check to verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/lib/mock-patches.ts
git commit -m "feat(contracts): add patch types, state machine, and mock data"
```

---

### Task 2: Patch Zustand Store

**Files:**

- Create: `apps/web/src/stores/patch.store.ts`

**Step 1: Create the patch store**

Follow the same API-first + mock fallback pattern as `extraction.store.ts`.

```typescript
import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_PATCHES,
  VALID_TRANSITIONS,
  type Patch,
  type PatchState,
} from "@/lib/mock-patches";

interface PatchStoreState {
  patches: Patch[];
  selectedPatch: Patch | null;
  isLoading: boolean;
  error: string | null;

  fetchPatches: (vaultId: string) => Promise<void>;
  selectPatch: (patchId: string) => void;
  clearSelectedPatch: () => void;
  createDraft: (
    vaultId: string,
    data: {
      field_name: string;
      current_value: string;
      proposed_value: string;
      intent: string;
      because_clause: string;
    },
  ) => void;
  canTransition: (patch: Patch, to: PatchState, actorId: string) => boolean;
}

export const usePatchStore = create<PatchStoreState>((set, get) => ({
  patches: [],
  selectedPatch: null,
  isLoading: false,
  error: null,

  fetchPatches: async (vaultId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<Patch[]>(`/api/v1/vaults/${vaultId}/patches`);
      set({ patches: data, isLoading: false });
    } catch {
      const mock = MOCK_PATCHES[vaultId] ?? [];
      set({ patches: mock, isLoading: false, error: null });
    }
  },

  selectPatch: (patchId) => {
    const patch = get().patches.find((p) => p.id === patchId) ?? null;
    set({ selectedPatch: patch });
  },

  clearSelectedPatch: () => set({ selectedPatch: null }),

  createDraft: (vaultId, data) => {
    const draft: Patch = {
      id: `patch_draft_${Date.now()}`,
      vault_id: vaultId,
      author_id: "current_user",
      author_name: "Current User",
      state: "draft",
      version: 1,
      field_name: data.field_name,
      current_value: data.current_value,
      proposed_value: data.proposed_value,
      intent: data.intent,
      because_clause: data.because_clause,
      history: [],
      approval_steps: [
        {
          id: `s_${Date.now()}_1`,
          label: "Submitted",
          status: "pending",
          actor_name: null,
          role: "author",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: `s_${Date.now()}_2`,
          label: "Verifier Review",
          status: "pending",
          actor_name: null,
          role: "verifier",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: `s_${Date.now()}_3`,
          label: "Admin Review",
          status: "pending",
          actor_name: null,
          role: "admin",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: `s_${Date.now()}_4`,
          label: "Applied",
          status: "pending",
          actor_name: null,
          role: "system",
          timestamp: null,
          sla_deadline: null,
        },
      ],
      sla_deadline: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({
      patches: [draft, ...state.patches],
      selectedPatch: draft,
    }));
  },

  canTransition: (patch, to, actorId) => {
    const transition = VALID_TRANSITIONS.find(
      (t) => t.from === patch.state && t.to === to,
    );
    if (!transition) return false;

    // Self-approval prevention
    if (
      (to === "verifier_approved" || to === "admin_approved") &&
      actorId === patch.author_id
    ) {
      return false;
    }

    return true;
  },
}));
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/stores/patch.store.ts
git commit -m "feat(contracts): add patch Zustand store with state machine"
```

---

### Task 3: PatchStateBadge Atom

**Files:**

- Create: `apps/web/src/components/atoms/PatchStateBadge.tsx`

**Step 1: Create the badge component**

Maps patch states to color-coded pill badges using the `stateCategory()` helper.

```tsx
import {
  STATE_LABELS,
  stateCategory,
  type PatchState,
} from "@/lib/mock-patches";

const categoryStyles: Record<string, string> = {
  active: "bg-accent-primary/20 text-accent-primary",
  success: "bg-gate-green/20 text-gate-green",
  danger: "bg-gate-red/20 text-gate-red",
  warning: "bg-gate-amber/20 text-gate-amber",
  neutral: "bg-text-muted/20 text-text-muted",
};

interface PatchStateBadgeProps {
  state: PatchState;
  className?: string;
}

export default function PatchStateBadge({
  state,
  className,
}: PatchStateBadgeProps) {
  const category = stateCategory(state);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryStyles[category]} ${className ?? ""}`}
    >
      {STATE_LABELS[state]}
    </span>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/components/atoms/PatchStateBadge.tsx
git commit -m "feat(contracts): add PatchStateBadge atom"
```

---

### Task 4: SLATimer Molecule

**Files:**

- Create: `apps/web/src/components/molecules/SLATimer.tsx`

**Step 1: Create the SLA timer component**

Countdown timer with color-coded urgency levels and SVG progress ring. Uses `'use client'` for `useEffect`/`useState` interval.

```tsx
"use client";

import { useState, useEffect } from "react";

interface SLATimerProps {
  deadline: string | null;
  paused?: boolean;
  className?: string;
}

function getTimeRemaining(deadline: string): number {
  return new Date(deadline).getTime() - Date.now();
}

function formatTime(ms: number): string {
  const negative = ms < 0;
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1_000);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${negative ? "-" : ""}${hh}:${mm}:${ss}`;
}

function getTimerColor(ms: number): string {
  if (ms < 0) return "text-gate-red";
  if (ms < 5 * 60_000) return "text-gate-red";
  if (ms < 15 * 60_000) return "text-gate-red";
  if (ms < 60 * 60_000) return "text-gate-amber";
  return "text-gate-green";
}

function getRingColor(ms: number): string {
  if (ms < 0) return "stroke-gate-red";
  if (ms < 15 * 60_000) return "stroke-gate-red";
  if (ms < 60 * 60_000) return "stroke-gate-amber";
  return "stroke-gate-green";
}

export default function SLATimer({
  deadline,
  paused,
  className,
}: SLATimerProps) {
  const [remaining, setRemaining] = useState<number | null>(
    deadline ? getTimeRemaining(deadline) : null,
  );

  useEffect(() => {
    if (!deadline || paused) return;
    setRemaining(getTimeRemaining(deadline));
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(deadline));
    }, 1_000);
    return () => clearInterval(interval);
  }, [deadline, paused]);

  if (!deadline) {
    return (
      <span className={`font-mono text-xs text-text-muted ${className ?? ""}`}>
        No deadline
      </span>
    );
  }

  if (paused) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <span className="font-mono text-xs text-text-muted">
          {remaining !== null ? formatTime(remaining) : "--:--:--"}
        </span>
        <span className="rounded bg-text-muted/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">
          Paused
        </span>
      </div>
    );
  }

  const ms = remaining ?? 0;
  const timerColor = getTimerColor(ms);
  const ringColor = getRingColor(ms);
  const shouldPulse = ms > 0 && ms < 5 * 60_000;

  // Progress ring: calculate stroke-dashoffset
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  // Assume 24h total SLA for ring proportion (clamped 0-1)
  const totalMs = 24 * 60 * 60_000;
  const progress = Math.max(0, Math.min(1, ms / totalMs));
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className="relative h-12 w-12 flex-shrink-0">
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-surface-border"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={`${ringColor} transition-all duration-1000`}
          />
        </svg>
      </div>
      <span
        className={`font-mono text-sm font-bold ${timerColor} ${shouldPulse ? "animate-pulse" : ""}`}
      >
        {formatTime(ms)}
      </span>
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/components/molecules/SLATimer.tsx
git commit -m "feat(contracts): add SLATimer molecule with progress ring"
```

---

### Task 5: ApprovalChain Organism

**Files:**

- Create: `apps/web/src/components/organisms/ApprovalChain.tsx`

**Step 1: Create the approval chain timeline**

Vertical dot timeline showing each gate in the patch approval flow. Uses the `ApprovalStep` type from mock-patches.

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import SLATimer from "@/components/molecules/SLATimer";
import type { ApprovalStep, ApprovalStepStatus } from "@/lib/mock-patches";

const dotStyles: Record<ApprovalStepStatus, string> = {
  completed: "bg-gate-green",
  active: "bg-accent-primary animate-pulse",
  pending: "border-2 border-text-muted bg-transparent",
  rejected: "bg-gate-red",
  returned: "bg-gate-amber",
};

const lineStyles: Record<ApprovalStepStatus, string> = {
  completed: "bg-gate-green",
  active: "bg-accent-primary",
  pending: "bg-surface-border",
  rejected: "bg-gate-red",
  returned: "bg-gate-amber",
};

interface ApprovalChainProps {
  steps: ApprovalStep[];
  className?: string;
}

export default function ApprovalChain({
  steps,
  className,
}: ApprovalChainProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isExpanded = expandedSteps.has(step.id);
        const isExpandable =
          step.status === "completed" || step.status === "returned";

        return (
          <div key={step.id} className="flex gap-3">
            {/* Timeline track */}
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 flex-shrink-0 rounded-full ${dotStyles[step.status]}`}
              />
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 ${lineStyles[step.status]}`}
                  style={{ minHeight: "2rem" }}
                />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <button
                    onClick={() => isExpandable && toggleStep(step.id)}
                    className={`flex items-center gap-1 text-sm font-medium text-text-primary ${isExpandable ? "cursor-pointer hover:text-text-secondary" : "cursor-default"}`}
                    disabled={!isExpandable}
                  >
                    {isExpandable &&
                      (isExpanded ? (
                        <ChevronDown size={12} className="text-text-muted" />
                      ) : (
                        <ChevronRight size={12} className="text-text-muted" />
                      ))}
                    {step.label}
                  </button>
                  <p className="text-xs text-text-muted">
                    {step.actor_name ??
                      (step.role === "system" ? "(system)" : "(unassigned)")}
                    {step.timestamp && (
                      <span className="ml-2 text-text-muted">
                        {new Date(step.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </p>
                </div>

                {/* Role badge */}
                <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                  {step.role}
                </span>
              </div>

              {/* SLA timer on active step */}
              {step.status === "active" && (
                <div className="mt-2">
                  <SLATimer deadline={step.sla_deadline} />
                </div>
              )}

              {/* Expanded detail */}
              {isExpanded && step.note && (
                <div className="mt-2 rounded bg-surface-sunken px-3 py-2">
                  <p className="text-xs text-text-secondary">{step.note}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/ApprovalChain.tsx
git commit -m "feat(contracts): add ApprovalChain timeline organism"
```

---

### Task 6: PatchList Molecule

**Files:**

- Create: `apps/web/src/components/molecules/PatchList.tsx`

**Step 1: Create the patch list component**

Shows all patches for a vault as clickable rows with state badge, field name, and summary.

```tsx
"use client";

import PatchStateBadge from "@/components/atoms/PatchStateBadge";
import type { Patch } from "@/lib/mock-patches";

interface PatchListProps {
  patches: Patch[];
  selectedPatchId: string | null;
  onSelect: (patchId: string) => void;
  className?: string;
}

export default function PatchList({
  patches,
  selectedPatchId,
  onSelect,
  className,
}: PatchListProps) {
  if (patches.length === 0) {
    return (
      <div
        className={`flex items-center justify-center p-6 ${className ?? ""}`}
      >
        <p className="text-sm text-text-muted">No patches for this vault.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      {patches.map((patch) => {
        const isSelected = patch.id === selectedPatchId;
        return (
          <button
            key={patch.id}
            onClick={() => onSelect(patch.id)}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-fast ${
              isSelected
                ? "bg-accent-primary/10 border border-accent-primary/30"
                : "hover:bg-surface-overlay border border-transparent"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-text-primary">
                  {patch.field_name}
                </span>
                <PatchStateBadge state={patch.state} />
              </div>
              <p className="mt-0.5 truncate text-xs text-text-muted">
                {patch.current_value} &rarr; {patch.proposed_value}
              </p>
            </div>
            <span className="flex-shrink-0 text-[10px] text-text-muted">
              {patch.author_name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/components/molecules/PatchList.tsx
git commit -m "feat(contracts): add PatchList molecule"
```

---

### Task 7: Wire Patches into Control Panel

**Files:**

- Modify: `apps/web/src/components/organisms/ControlPanel.tsx`

**Step 1: Update the Control panel to render real content for Approvals and SLA tabs**

Replace the placeholder text for the "approvals" and "sla" tabs with actual patch-aware content. The Control panel receives the vault ID as a prop and connects to the patch store.

```tsx
"use client";

import { useEffect } from "react";
import { GitBranch, Clock, CheckCircle, ScrollText, Bot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ControlTab from "@/components/molecules/ControlTab";
import PatchList from "@/components/molecules/PatchList";
import PatchStateBadge from "@/components/atoms/PatchStateBadge";
import ApprovalChain from "@/components/organisms/ApprovalChain";
import SLATimer from "@/components/molecules/SLATimer";
import { usePatchStore } from "@/stores/patch.store";

/** Tab definition with icon, label, and placeholder content */
interface TabDef {
  key: string;
  icon: LucideIcon;
  label: string;
  placeholder: string;
}

const TABS: TabDef[] = [
  {
    key: "lifecycle",
    icon: GitBranch,
    label: "Lifecycle",
    placeholder: "State diagram will render here",
  },
  {
    key: "sla",
    icon: Clock,
    label: "SLA",
    placeholder: "SLA countdown and deadlines",
  },
  {
    key: "approvals",
    icon: CheckCircle,
    label: "Approvals",
    placeholder: "Approval chain stepper",
  },
  {
    key: "audit",
    icon: ScrollText,
    label: "Audit",
    placeholder: "Chronological audit log",
  },
  {
    key: "ai-agent",
    icon: Bot,
    label: "AI Agent",
    placeholder: "Chat interface with Otto",
  },
];

/** Collapsed-mode icon list */
const collapsedIcons: { key: string; icon: LucideIcon; label: string }[] = [
  { key: "lifecycle", icon: GitBranch, label: "Lifecycle" },
  { key: "sla", icon: Clock, label: "SLA" },
  { key: "approvals", icon: CheckCircle, label: "Approvals" },
  { key: "audit", icon: ScrollText, label: "Audit" },
  { key: "ai-agent", icon: Bot, label: "AI Agent" },
];

interface ControlPanelProps {
  /** Panel width in pixels */
  width: number;
  /** Whether the panel is collapsed to icon-only mode */
  collapsed: boolean;
  /** Callback to toggle panel overlay/expand */
  onOverlayToggle: () => void;
  /** Currently active tab key */
  activeTab: string;
  /** Callback when a tab is selected */
  onTabChange: (tab: string) => void;
  /** Vault ID for loading patches (optional — null when no vault selected) */
  vaultId?: string | null;
}

export default function ControlPanel({
  width,
  collapsed,
  onOverlayToggle,
  activeTab,
  onTabChange,
  vaultId,
}: ControlPanelProps) {
  const { patches, selectedPatch, fetchPatches, selectPatch } = usePatchStore();

  useEffect(() => {
    if (vaultId) {
      fetchPatches(vaultId);
    }
  }, [vaultId, fetchPatches]);

  // Collapsed icon-only mode
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center pt-4 gap-3 bg-surface-raised border-l border-surface-border h-full flex-shrink-0"
        style={{ width }}
      >
        {collapsedIcons.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.key}
              onClick={onOverlayToggle}
              className="text-text-muted hover:text-text-secondary cursor-pointer transition-colors duration-fast"
              aria-label={item.label}
            >
              <IconComponent size={20} />
            </button>
          );
        })}
      </div>
    );
  }

  // Find the active tab's placeholder content
  const activeTabDef = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "approvals":
        return (
          <div className="flex flex-col gap-4">
            <PatchList
              patches={patches}
              selectedPatchId={selectedPatch?.id ?? null}
              onSelect={selectPatch}
            />
            {selectedPatch && (
              <div className="border-t border-surface-border pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">
                    {selectedPatch.field_name}
                  </span>
                  <PatchStateBadge state={selectedPatch.state} />
                </div>
                <ApprovalChain steps={selectedPatch.approval_steps} />
              </div>
            )}
          </div>
        );

      case "sla":
        return (
          <div className="flex flex-col gap-4">
            {patches
              .filter((p) => p.sla_deadline)
              .map((patch) => (
                <div
                  key={patch.id}
                  className="rounded-lg border border-surface-border bg-surface-overlay p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary">
                      {patch.field_name}
                    </span>
                    <PatchStateBadge state={patch.state} />
                  </div>
                  <SLATimer
                    deadline={patch.sla_deadline}
                    paused={patch.state === "admin_hold"}
                  />
                  <p className="mt-1 text-[10px] text-text-muted">
                    {patch.approval_steps.find((s) => s.status === "active")
                      ?.actor_name ?? "Awaiting assignment"}
                  </p>
                </div>
              ))}
            {patches.filter((p) => p.sla_deadline).length === 0 && (
              <p className="text-sm text-text-muted">
                No active SLA deadlines.
              </p>
            )}
          </div>
        );

      default:
        return (
          <p className="text-sm text-text-muted">{activeTabDef.placeholder}</p>
        );
    }
  };

  // Expanded mode
  return (
    <div
      className="flex flex-col bg-surface-raised border-l border-surface-border h-full overflow-hidden flex-shrink-0"
      style={{ width }}
    >
      {/* Tab bar */}
      <div
        className="h-10 bg-surface-raised border-b border-surface-border flex flex-shrink-0"
        role="tablist"
        aria-label="Control panel tabs"
      >
        {TABS.map((tab) => (
          <ControlTab
            key={tab.key}
            icon={tab.icon}
            label={tab.label}
            isActive={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
          />
        ))}
      </div>

      {/* Tab content */}
      <div
        className="flex-1 overflow-y-auto p-4"
        role="tabpanel"
        aria-label={activeTabDef.label}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}
```

**Step 2: Update TriptychLayout to pass vaultId to ControlPanel**

Read `apps/web/src/components/templates/TriptychLayout.tsx` first to understand how `ControlPanel` is rendered. Add a `vaultId` prop passthrough.

The TriptychLayout needs to accept an optional `vaultId` prop and pass it through. Read the file to find the exact `<ControlPanel` usage and add `vaultId={vaultId}`.

**Step 3: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: Exit code 0

**Step 4: Commit**

```bash
git add apps/web/src/components/organisms/ControlPanel.tsx apps/web/src/components/templates/TriptychLayout.tsx
git commit -m "feat(contracts): wire patches into Control panel Approvals + SLA tabs"
```

---

### Task 8: Simplified Patch Editor Form

**Files:**

- Create: `apps/web/src/components/organisms/PatchEditor.tsx`

**Step 1: Create the patch editor form**

A simplified form for composing patches — field selector dropdown, intent textarea, because clause textarea, and current→proposed value inputs. No visual when/then builder (that comes later).

```tsx
"use client";

import { useState } from "react";
import type { ExtractionField } from "@/lib/mock-extractions";

interface PatchEditorProps {
  fields: ExtractionField[];
  onSaveDraft: (data: {
    field_name: string;
    current_value: string;
    proposed_value: string;
    intent: string;
    because_clause: string;
  }) => void;
  onCancel: () => void;
}

export default function PatchEditor({
  fields,
  onSaveDraft,
  onCancel,
}: PatchEditorProps) {
  const [selectedField, setSelectedField] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [intent, setIntent] = useState("");
  const [becauseClause, setBecauseClause] = useState("");

  const currentField = fields.find((f) => f.field_name === selectedField);

  const canSubmit =
    selectedField &&
    proposedValue.trim() &&
    intent.trim() &&
    becauseClause.trim();

  const handleSubmit = () => {
    if (!canSubmit || !currentField) return;
    onSaveDraft({
      field_name: selectedField,
      current_value: currentField.extracted_value,
      proposed_value: proposedValue,
      intent,
      because_clause: becauseClause,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
        New Patch
      </h3>

      {/* Field selector */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Field to Patch
        </label>
        <select
          value={selectedField}
          onChange={(e) => {
            setSelectedField(e.target.value);
            setProposedValue("");
          }}
          className="w-full rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="">Select a field...</option>
          {fields.map((f) => (
            <option key={f.id} value={f.field_name}>
              {f.field_name}
            </option>
          ))}
        </select>
      </div>

      {/* Current value (read-only) */}
      {currentField && (
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Current Value
          </label>
          <div className="rounded-md bg-surface-sunken px-3 py-2 font-mono text-sm text-text-muted">
            {currentField.extracted_value}
          </div>
        </div>
      )}

      {/* Proposed value */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Proposed Value
        </label>
        <input
          type="text"
          value={proposedValue}
          onChange={(e) => setProposedValue(e.target.value)}
          placeholder="Enter the corrected value"
          className="w-full rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          disabled={!selectedField}
        />
      </div>

      {/* Intent */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Intent
        </label>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="What are you changing and why?"
          rows={2}
          className="w-full resize-none rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      {/* Because clause */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Because
        </label>
        <textarea
          value={becauseClause}
          onChange={(e) => setBecauseClause(e.target.value)}
          placeholder="Explain the business rationale for this change..."
          rows={3}
          className="w-full resize-none rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save Draft
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-overlay"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/PatchEditor.tsx
git commit -m "feat(contracts): add simplified PatchEditor form organism"
```

---

### Task 9: Lint + Type-Check Full Verification

**Files:**

- None (verification only)

**Step 1: Run full type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: Exit code 0

**Step 2: Run full lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx eslint src/ --ext .ts,.tsx`
Expected: Exit code 0

**Step 3: Fix any issues found, then commit if fixes were needed**

```bash
git add -A
git commit -m "fix(contracts): resolve lint/type errors from patch workflow"
```
