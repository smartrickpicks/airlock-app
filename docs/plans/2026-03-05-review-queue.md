# Review Queue Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Gatekeeper's cross-vault review dashboard at `/contracts/review-queue` — a full-width view aggregating parent vault cards, handoff signals, filter bar, and activity feed.

**Architecture:** Full-width dashboard (no triptych) within the Contracts module's Review chamber. Four stacked sections: parent vault entity cards with expand/collapse child tables, handoff signal alert panels (RFIs/Corrections/Anomalies), a filter bar with signal pills + dropdowns, and a reverse-chronological activity feed grouped by time period. All data is mock for this milestone.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zustand, Tailwind (token classes only), lucide-react icons

---

## Task 1: Mock Review Queue Data

**Files:**

- Create: `apps/web/src/lib/mock-review-queue.ts`

**Context:** This file provides ALL mock data for the Review Queue page. It follows the same pattern as `mock-vaults.ts`, `mock-events.ts`, `mock-patches.ts` — typed interfaces + exported constants. The Review Queue spec defines 4 data domains: parent vault cards, child vault rows, handoff signals (RFIs/Corrections/Anomalies), and activity feed items.

**Step 1: Create the mock data file with all types and data**

```typescript
/**
 * Mock data for the Review Queue — Gatekeeper's cross-vault dashboard.
 * Remove this file once the API + Postgres are available.
 */

// ─── Types ───────────────────────────────────────────────────────

export type SignalType =
  | "patch"
  | "rfi"
  | "correction"
  | "anomaly"
  | "activity"
  | "escalation";

export type FeedEventType =
  | "patch.submitted"
  | "patch.approved"
  | "patch.clarification_needed"
  | "rfi.created"
  | "correction.submitted"
  | "anomaly.detected"
  | "activity.summary"
  | "escalation.triggered";

export type GateStatus = "pass" | "review" | "fail" | "failed";

export interface ChildVault {
  id: string;
  counterparty: string;
  builder: string;
  healthScore: number;
  gateStatus: GateStatus;
  gateLabel: string;
  itemCount: number;
  category: string;
}

export interface ParentVaultCard {
  id: string;
  name: string;
  typeBadge: string;
  vaultCount: number;
  healthScore: number;
  assignedBuilders: string[];
  buildReadyPercent: number;
  buildReadyCount: number;
  buildReadyTotal: number;
  patches: number;
  rfis: number;
  corrections: number;
  anomalies: number;
  children: ChildVault[];
}

export interface HandoffSignalItem {
  id: string;
  vaultName: string;
  entityTag: string;
  analyst: string;
  description: string;
  timestamp: string;
}

export interface HandoffSignal {
  type: "rfi" | "correction" | "anomaly";
  label: string;
  count: number;
  breakdown: string;
  items: HandoffSignalItem[];
}

export interface FeedItem {
  id: string;
  eventType: FeedEventType;
  title: string;
  vaultName: string;
  entityName: string;
  builderName: string;
  detail: string;
  badge: string | null;
  timestamp: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

// ─── Parent Vault Cards ──────────────────────────────────────────

export const MOCK_PARENT_VAULTS: ParentVaultCard[] = [
  {
    id: "pv_001",
    name: "Ostereo",
    typeBadge: "Distribution",
    vaultCount: 62,
    healthScore: 41,
    assignedBuilders: ["Daniele Leoni", "Ana Chen"],
    buildReadyPercent: 27,
    buildReadyCount: 17,
    buildReadyTotal: 62,
    patches: 8,
    rfis: 3,
    corrections: 5,
    anomalies: 2,
    children: [
      {
        id: "cv_001",
        counterparty: "Summit Publishing",
        builder: "Daniele Leoni",
        healthScore: 38,
        gateStatus: "review",
        gateLabel: "Gatekeeper Review",
        itemCount: 4,
        category: "Publishing",
      },
      {
        id: "cv_002",
        counterparty: "Meridian Sync",
        builder: "Ana Chen",
        healthScore: 55,
        gateStatus: "pass",
        gateLabel: "Preflight Passed",
        itemCount: 7,
        category: "Sync",
      },
      {
        id: "cv_003",
        counterparty: "Northstar Digital",
        builder: "Daniele Leoni",
        healthScore: 22,
        gateStatus: "fail",
        gateLabel: "Extraction Failed",
        itemCount: 3,
        category: "Digital",
      },
      {
        id: "cv_004",
        counterparty: "Coastal Media",
        builder: "Ana Chen",
        healthScore: 61,
        gateStatus: "review",
        gateLabel: "Pending Review",
        itemCount: 5,
        category: "Publishing",
      },
    ],
  },
  {
    id: "pv_002",
    name: "Get Dough Entertainment",
    typeBadge: "License",
    vaultCount: 9,
    healthScore: 52,
    assignedBuilders: ["Marcus Webb"],
    buildReadyPercent: 56,
    buildReadyCount: 5,
    buildReadyTotal: 9,
    patches: 2,
    rfis: 0,
    corrections: 1,
    anomalies: 0,
    children: [
      {
        id: "cv_005",
        counterparty: "Apex Films",
        builder: "Marcus Webb",
        healthScore: 48,
        gateStatus: "review",
        gateLabel: "Gatekeeper Review",
        itemCount: 3,
        category: "Film",
      },
      {
        id: "cv_006",
        counterparty: "Pinnacle Studios",
        builder: "Marcus Webb",
        healthScore: 67,
        gateStatus: "pass",
        gateLabel: "Preflight Passed",
        itemCount: 2,
        category: "Film",
      },
    ],
  },
  {
    id: "pv_003",
    name: "Broke Records",
    typeBadge: "Distribution",
    vaultCount: 15,
    healthScore: 49,
    assignedBuilders: ["Ana Chen", "Jordan Blake"],
    buildReadyPercent: 40,
    buildReadyCount: 6,
    buildReadyTotal: 15,
    patches: 4,
    rfis: 1,
    corrections: 2,
    anomalies: 1,
    children: [
      {
        id: "cv_007",
        counterparty: "Harmony Digital",
        builder: "Ana Chen",
        healthScore: 44,
        gateStatus: "review",
        gateLabel: "Pending Review",
        itemCount: 6,
        category: "Digital",
      },
      {
        id: "cv_008",
        counterparty: "Rhythm Publishing",
        builder: "Jordan Blake",
        healthScore: 35,
        gateStatus: "fail",
        gateLabel: "Data Issues",
        itemCount: 4,
        category: "Publishing",
      },
      {
        id: "cv_009",
        counterparty: "Tempo Sync",
        builder: "Jordan Blake",
        healthScore: 72,
        gateStatus: "pass",
        gateLabel: "Preflight Passed",
        itemCount: 2,
        category: "Sync",
      },
    ],
  },
];

// ─── Handoff Signals ─────────────────────────────────────────────

export const MOCK_HANDOFF_SIGNALS: HandoffSignal[] = [
  {
    type: "rfi",
    label: "RFIs",
    count: 3,
    breakdown: "3 open, 1 responded",
    items: [
      {
        id: "rfi_001",
        vaultName: "Summit Publishing License",
        entityTag: "Ostereo",
        analyst: "Daniele Leoni",
        description:
          "Territory scope unclear — does 'Worldwide' include digital-only markets?",
        timestamp: minutesAgo(45),
      },
      {
        id: "rfi_002",
        vaultName: "Harmony Digital Dist",
        entityTag: "Broke Records",
        analyst: "Ana Chen",
        description: "Missing counterparty signatory information on page 12",
        timestamp: hoursAgo(3),
      },
      {
        id: "rfi_003",
        vaultName: "Coastal Media Agreement",
        entityTag: "Ostereo",
        analyst: "Ana Chen",
        description:
          "Royalty rate conflicts between Schedule A and Section 4.2",
        timestamp: hoursAgo(6),
      },
    ],
  },
  {
    type: "correction",
    label: "Corrections",
    count: 8,
    breakdown: "5 pending review, 2 approved, 1 rejected",
    items: [
      {
        id: "cor_001",
        vaultName: "Ostereo Master Dist",
        entityTag: "Ostereo",
        analyst: "Daniele Leoni",
        description:
          "SF Account Name changed: 'Ostereo Inc' → 'Ostereo Entertainment LLC'",
        timestamp: minutesAgo(12),
      },
      {
        id: "cor_002",
        vaultName: "Apex Films License",
        entityTag: "Get Dough",
        analyst: "Marcus Webb",
        description: "Effective date corrected: 2025-01-15 → 2026-01-15",
        timestamp: minutesAgo(90),
      },
      {
        id: "cor_003",
        vaultName: "Rhythm Publishing Dist",
        entityTag: "Broke Records",
        analyst: "Jordan Blake",
        description: "Territory field updated from 'US' to 'US + Canada'",
        timestamp: hoursAgo(4),
      },
      {
        id: "cor_004",
        vaultName: "Northstar Digital Agreement",
        entityTag: "Ostereo",
        analyst: "Daniele Leoni",
        description:
          "Contract type reclassified: 'License' → 'Sub-Distribution'",
        timestamp: hoursAgo(8),
      },
      {
        id: "cor_005",
        vaultName: "Meridian Sync Deal",
        entityTag: "Ostereo",
        analyst: "Ana Chen",
        description: "Payment terms corrected: Net 30 → Net 60",
        timestamp: daysAgo(1),
      },
    ],
  },
  {
    type: "anomaly",
    label: "Anomalies",
    count: 3,
    breakdown: "1 OCR misread, 1 account mismatch, 1 processing failure",
    items: [
      {
        id: "ano_001",
        vaultName: "Northstar Digital Agreement",
        entityTag: "Ostereo",
        analyst: "Daniele Leoni",
        description: "OCR misread: 'Ostereo' extracted as 'Oster30' on page 3",
        timestamp: minutesAgo(30),
      },
      {
        id: "ano_002",
        vaultName: "Harmony Digital Dist",
        entityTag: "Broke Records",
        analyst: "Ana Chen",
        description:
          "Account name 'Broke Records Ltd' not found in document text",
        timestamp: hoursAgo(2),
      },
      {
        id: "ano_003",
        vaultName: "Rhythm Publishing Dist",
        entityTag: "Broke Records",
        analyst: "Jordan Blake",
        description:
          "PDF processing failure: pages 8-12 returned empty extraction",
        timestamp: hoursAgo(5),
      },
    ],
  },
];

// ─── Activity Feed ───────────────────────────────────────────────

export const MOCK_FEED_ITEMS: FeedItem[] = [
  {
    id: "feed_001",
    eventType: "correction.submitted",
    title: "SF Account Name changed",
    vaultName: "Ostereo Master Dist",
    entityName: "Ostereo",
    builderName: "Daniele Leoni",
    detail: "'Ostereo Inc' → 'Ostereo Entertainment LLC'",
    badge: "CORRECTION",
    timestamp: minutesAgo(12),
  },
  {
    id: "feed_002",
    eventType: "anomaly.detected",
    title: "Account name not in document",
    vaultName: "Harmony Digital Dist",
    entityName: "Broke Records",
    builderName: "Ana Chen",
    detail: "'Broke Records Ltd' not found in extracted text",
    badge: "ANOMALY",
    timestamp: minutesAgo(25),
  },
  {
    id: "feed_003",
    eventType: "patch.submitted",
    title: "Patch #12 submitted",
    vaultName: "Apex Films License",
    entityName: "Get Dough",
    builderName: "Marcus Webb",
    detail: "Effective date correction: 2025-01-15 → 2026-01-15",
    badge: null,
    timestamp: minutesAgo(42),
  },
  {
    id: "feed_004",
    eventType: "rfi.created",
    title: "Territory scope question",
    vaultName: "Summit Publishing License",
    entityName: "Ostereo",
    builderName: "Daniele Leoni",
    detail: "Does 'Worldwide' include digital-only markets?",
    badge: "RFI",
    timestamp: minutesAgo(55),
  },
  {
    id: "feed_005",
    eventType: "patch.approved",
    title: "Patch #9 approved",
    vaultName: "Meridian Sync Deal",
    entityName: "Ostereo",
    builderName: "Ana Chen",
    detail: "Payment terms update accepted",
    badge: null,
    timestamp: hoursAgo(1),
  },
  {
    id: "feed_006",
    eventType: "anomaly.detected",
    title: "OCR misread detected",
    vaultName: "Northstar Digital Agreement",
    entityName: "Ostereo",
    builderName: "Daniele Leoni",
    detail: "'Ostereo' extracted as 'Oster30' on page 3",
    badge: "ANOMALY",
    timestamp: hoursAgo(2),
  },
  {
    id: "feed_007",
    eventType: "correction.submitted",
    title: "Territory field updated",
    vaultName: "Rhythm Publishing Dist",
    entityName: "Broke Records",
    builderName: "Jordan Blake",
    detail: "'US' → 'US + Canada'",
    badge: "CORRECTION",
    timestamp: hoursAgo(4),
  },
  {
    id: "feed_008",
    eventType: "patch.clarification_needed",
    title: "Patch #7 needs clarification",
    vaultName: "Coastal Media Agreement",
    entityName: "Ostereo",
    builderName: "Ana Chen",
    detail: "Royalty rate change lacks supporting document reference",
    badge: null,
    timestamp: hoursAgo(5),
  },
  {
    id: "feed_009",
    eventType: "activity.summary",
    title: "Daily summary — Ana Chen",
    vaultName: "Multiple",
    entityName: "Ostereo, Broke Records",
    builderName: "Ana Chen",
    detail: "8 vaults reviewed, 3 corrections submitted, 1 RFI",
    badge: null,
    timestamp: daysAgo(1),
  },
  {
    id: "feed_010",
    eventType: "escalation.triggered",
    title: "SLA breach — 48h review window",
    vaultName: "Northstar Digital Agreement",
    entityName: "Ostereo",
    builderName: "Daniele Leoni",
    detail: "Vault has been in Review chamber for 52 hours without gate action",
    badge: null,
    timestamp: daysAgo(1),
  },
  {
    id: "feed_011",
    eventType: "patch.submitted",
    title: "Patch #11 submitted",
    vaultName: "Tempo Sync Deal",
    entityName: "Broke Records",
    builderName: "Jordan Blake",
    detail: "Contract type reclassified to Sync License",
    badge: null,
    timestamp: daysAgo(2),
  },
  {
    id: "feed_012",
    eventType: "correction.submitted",
    title: "Contract type reclassified",
    vaultName: "Northstar Digital Agreement",
    entityName: "Ostereo",
    builderName: "Daniele Leoni",
    detail: "'License' → 'Sub-Distribution'",
    badge: "CORRECTION",
    timestamp: daysAgo(3),
  },
];

// ─── Dot color mapping ──────────────────────────────────────────

export const FEED_EVENT_COLORS: Record<FeedEventType, string> = {
  "patch.submitted": "bg-accent-danger",
  "patch.approved": "bg-accent-success",
  "patch.clarification_needed": "bg-accent-warning",
  "rfi.created": "bg-accent-warning",
  "correction.submitted": "bg-accent-secondary",
  "anomaly.detected": "bg-accent-danger",
  "activity.summary": "bg-accent-primary",
  "escalation.triggered": "bg-accent-danger",
};

export const FEED_EVENT_PULSE: Record<FeedEventType, boolean> = {
  "patch.submitted": false,
  "patch.approved": false,
  "patch.clarification_needed": false,
  "rfi.created": false,
  "correction.submitted": false,
  "anomaly.detected": true,
  "activity.summary": false,
  "escalation.triggered": true,
};

// ─── Builders list (for filter dropdown) ─────────────────────────

export const MOCK_BUILDERS = [
  "Daniele Leoni",
  "Ana Chen",
  "Marcus Webb",
  "Jordan Blake",
];
```

**Step 2: Verify file has no syntax errors**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS (clean)

**Step 3: Commit**

```bash
git add apps/web/src/lib/mock-review-queue.ts
git commit -m "feat(contracts): add mock review queue data — parent vaults, signals, feed"
```

---

## Task 2: Review Queue Zustand Store

**Files:**

- Create: `apps/web/src/stores/review-queue.store.ts`

**Context:** Follows the same pattern as `event.store.ts` and `patch.store.ts` — Zustand store with `apiFetch` + mock fallback in catch. Manages: parent vault cards, handoff signals, feed items, filter state, and expanded card IDs.

**Step 1: Create the store**

```typescript
import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_PARENT_VAULTS,
  MOCK_HANDOFF_SIGNALS,
  MOCK_FEED_ITEMS,
  type ParentVaultCard,
  type HandoffSignal,
  type FeedItem,
  type SignalType,
} from "@/lib/mock-review-queue";

interface ReviewQueueState {
  /** Parent vault cards */
  parentVaults: ParentVaultCard[];
  /** Handoff signal panels */
  signals: HandoffSignal[];
  /** Activity feed items */
  feedItems: FeedItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  /** IDs of expanded parent vault cards */
  expandedCards: Set<string>;
  /** Active filter type (signal pill) */
  activeFilter: SignalType | "all";
  /** Builder dropdown filter */
  builderFilter: string | null;
  /** Entity dropdown filter */
  entityFilter: string | null;

  /** Fetch all review queue data */
  fetchReviewQueue: () => Promise<void>;
  /** Toggle expand/collapse a parent vault card */
  toggleCard: (cardId: string) => void;
  /** Set the active signal type filter */
  setActiveFilter: (filter: SignalType | "all") => void;
  /** Set builder filter */
  setBuilderFilter: (builder: string | null) => void;
  /** Set entity filter */
  setEntityFilter: (entity: string | null) => void;
}

export const useReviewQueueStore = create<ReviewQueueState>((set) => ({
  parentVaults: [],
  signals: [],
  feedItems: [],
  isLoading: false,
  error: null,

  expandedCards: new Set<string>(),
  activeFilter: "all",
  builderFilter: null,
  entityFilter: null,

  fetchReviewQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{
        parentVaults: ParentVaultCard[];
        signals: HandoffSignal[];
        feedItems: FeedItem[];
      }>("/api/v1/contracts/review-queue");
      set({
        parentVaults: data.parentVaults,
        signals: data.signals,
        feedItems: data.feedItems,
        isLoading: false,
      });
    } catch {
      set({
        parentVaults: MOCK_PARENT_VAULTS,
        signals: MOCK_HANDOFF_SIGNALS,
        feedItems: MOCK_FEED_ITEMS,
        isLoading: false,
        error: null,
      });
    }
  },

  toggleCard: (cardId) =>
    set((state) => {
      const next = new Set(state.expandedCards);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return { expandedCards: next };
    }),

  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setBuilderFilter: (builder) => set({ builderFilter: builder }),
  setEntityFilter: (entity) => set({ entityFilter: entity }),
}));
```

**Step 2: Type-check**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/stores/review-queue.store.ts
git commit -m "feat(contracts): add ReviewQueue Zustand store with filters"
```

---

## Task 3: EntityCard Organism

**Files:**

- Create: `apps/web/src/components/organisms/EntityCard.tsx`

**Context:** This is the parent vault card from Section 1 of the spec. Shows header with name + type badge + chevron, stats row, assigned builders, progress bar (color-coded), action counts (patches/RFIs/corrections/anomalies with amber/red highlights). Expands to show a child vault table with sortable columns. Uses `ParentVaultCard` type from mock data. Review chamber = purple accent color.

**Step 1: Create the EntityCard component**

```typescript
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ParentVaultCard, ChildVault, GateStatus } from "@/lib/mock-review-queue";

interface EntityCardProps {
  card: ParentVaultCard;
  expanded: boolean;
  onToggle: () => void;
}

const GATE_DOT: Record<GateStatus, string> = {
  pass: "bg-accent-success",
  review: "bg-chamber-review",
  fail: "bg-accent-danger",
  failed: "bg-accent-danger",
};

function progressColor(percent: number): string {
  if (percent < 30) return "bg-accent-danger";
  if (percent <= 60) return "bg-accent-warning";
  return "bg-accent-success";
}

function ActionCount({ label, count }: { label: string; count: number }) {
  const urgent = count > 3;
  return (
    <span
      className={`text-xs ${urgent ? "text-accent-warning font-semibold" : "text-text-muted"}`}
    >
      {count} {label}
    </span>
  );
}

function ChildRow({ child }: { child: ChildVault }) {
  return (
    <tr className="border-b border-surface-border-subtle hover:bg-surface-overlay cursor-pointer transition-colors duration-fast">
      <td className="px-3 py-2 text-sm text-text-primary">{child.counterparty}</td>
      <td className="px-3 py-2 text-sm text-text-secondary">{child.builder}</td>
      <td className="px-3 py-2 text-sm">
        <span
          className={`font-mono ${
            child.healthScore < 40
              ? "text-accent-danger"
              : child.healthScore < 60
                ? "text-accent-warning"
                : "text-accent-success"
          }`}
        >
          {child.healthScore}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          <span className={`inline-block h-2 w-2 rounded-full ${GATE_DOT[child.gateStatus]}`} />
          {child.gateLabel}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-text-muted text-right">{child.itemCount}</td>
    </tr>
  );
}

export default function EntityCard({ card, expanded, onToggle }: EntityCardProps) {
  // Group children by category for sub-headers
  const categories = [...new Set(card.children.map((c) => c.category))];

  return (
    <div
      className={`rounded-lg border transition-colors duration-fast ${
        expanded
          ? "border-accent-primary/40 bg-surface-raised"
          : "border-surface-border hover:border-text-muted/30 bg-surface-raised"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? (
          <ChevronDown size={16} className="text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary truncate">
              {card.name}
            </span>
            <span className="rounded-full bg-chamber-review/15 px-2 py-0.5 text-[10px] font-medium text-chamber-review">
              {card.typeBadge}
            </span>
          </div>

          {/* Stats row */}
          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
            <span>{card.vaultCount} vaults</span>
            <span>Health: {card.healthScore}</span>
          </div>

          {/* Assigned builders */}
          <div className="mt-0.5 text-xs text-text-secondary">
            {card.assignedBuilders.join(", ")}
          </div>

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-surface-overlay overflow-hidden">
              <div
                className={`h-full rounded-full ${progressColor(card.buildReadyPercent)}`}
                style={{ width: `${card.buildReadyPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-text-muted whitespace-nowrap">
              {card.buildReadyPercent}% build-ready ({card.buildReadyCount}/{card.buildReadyTotal})
            </span>
          </div>

          {/* Action counts */}
          <div className="mt-1.5 flex items-center gap-3">
            <ActionCount label="patches" count={card.patches} />
            <ActionCount label="RFIs" count={card.rfis} />
            <ActionCount label="corrections" count={card.corrections} />
            <ActionCount label="anomalies" count={card.anomalies} />
          </div>
        </div>
      </button>

      {/* Expanded child table */}
      {expanded && card.children.length > 0 && (
        <div className="border-t border-surface-border-subtle px-4 pb-3 pt-2">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-3 py-1 text-left font-medium">Counterparty</th>
                <th className="px-3 py-1 text-left font-medium">Builder</th>
                <th className="px-3 py-1 text-left font-medium">Health</th>
                <th className="px-3 py-1 text-left font-medium">Status</th>
                <th className="px-3 py-1 text-right font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const rows = card.children.filter((c) => c.category === cat);
                return [
                  <tr key={`cat-${cat}`}>
                    <td
                      colSpan={5}
                      className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted"
                    >
                      {cat}
                    </td>
                  </tr>,
                  ...rows.map((child) => <ChildRow key={child.id} child={child} />),
                ];
              })}
            </tbody>
          </table>
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
git add apps/web/src/components/organisms/EntityCard.tsx
git commit -m "feat(contracts): add EntityCard organism — parent vault card with child table"
```

---

## Task 4: HandoffSignalPanel Molecule

**Files:**

- Create: `apps/web/src/components/molecules/HandoffSignalPanel.tsx`

**Context:** Section 2 of the spec. Three alert summary cards showing RFIs, Corrections, and Anomalies. Each has an icon, title, large count, breakdown text, and top items list. Icons: RFI = `HelpCircle`, Corrections = `Pencil`, Anomalies = `AlertTriangle` (from lucide-react). Count color: RFI = amber, Corrections = secondary (indigo), Anomalies = danger (red).

**Step 1: Create the HandoffSignalPanel component**

```typescript
"use client";

import { HelpCircle, Pencil, AlertTriangle, type LucideIcon } from "lucide-react";
import type { HandoffSignal } from "@/lib/mock-review-queue";

interface HandoffSignalPanelProps {
  signal: HandoffSignal;
}

const SIGNAL_CONFIG: Record<
  string,
  { icon: LucideIcon; countColor: string; borderColor: string }
> = {
  rfi: {
    icon: HelpCircle,
    countColor: "text-accent-warning",
    borderColor: "border-accent-warning/20",
  },
  correction: {
    icon: Pencil,
    countColor: "text-accent-secondary",
    borderColor: "border-accent-secondary/20",
  },
  anomaly: {
    icon: AlertTriangle,
    countColor: "text-accent-danger",
    borderColor: "border-accent-danger/20",
  },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HandoffSignalPanel({ signal }: HandoffSignalPanelProps) {
  const config = SIGNAL_CONFIG[signal.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex flex-col rounded-lg border bg-surface-raised p-4 ${config.borderColor}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon size={16} className={config.countColor} />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {signal.label}
        </span>
      </div>

      {/* Count */}
      <span className={`mt-2 font-mono text-3xl font-bold ${config.countColor}`}>
        {signal.count}
      </span>

      {/* Breakdown */}
      <span className="mt-1 text-xs text-text-muted">{signal.breakdown}</span>

      {/* Top items */}
      <div className="mt-3 flex flex-col gap-2">
        {signal.items.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="rounded-md bg-surface-overlay px-3 py-2 cursor-pointer hover:bg-surface-border-subtle transition-colors duration-fast"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary truncate">
                {item.vaultName}
              </span>
              <span className="rounded-full bg-surface-border px-1.5 py-0.5 text-[10px] text-text-muted">
                {item.entityTag}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
              {item.description}
            </p>
            <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted">
              <span>{item.analyst}</span>
              <span>{relativeTime(item.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Overflow link */}
      {signal.items.length > 3 && (
        <button className="mt-2 cursor-pointer text-xs text-accent-primary hover:underline self-start">
          View all {signal.count} items
        </button>
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
git add apps/web/src/components/molecules/HandoffSignalPanel.tsx
git commit -m "feat(contracts): add HandoffSignalPanel molecule — RFI/Correction/Anomaly cards"
```

---

## Task 5: FilterBar Molecule

**Files:**

- Create: `apps/web/src/components/molecules/FilterBar.tsx`

**Context:** Section 3 of the spec. Signal type pills (All, Patches, RFIs, Corrections, Anomalies, Activity, Escalations) + two dropdowns (Builder, Entity). Active pill gets cyan accent. Filters combine with AND logic. Connected to ReviewQueue store's `activeFilter`, `builderFilter`, `entityFilter` setters.

**Step 1: Create the FilterBar component**

```typescript
"use client";

import type { SignalType } from "@/lib/mock-review-queue";

type FilterType = SignalType | "all";

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  builderFilter: string | null;
  onBuilderChange: (builder: string | null) => void;
  entityFilter: string | null;
  onEntityChange: (entity: string | null) => void;
  builders: string[];
  entities: string[];
}

const PILLS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "patch", label: "Patches" },
  { value: "rfi", label: "RFIs" },
  { value: "correction", label: "Corrections" },
  { value: "anomaly", label: "Anomalies" },
  { value: "activity", label: "Activity" },
  { value: "escalation", label: "Escalations" },
];

export default function FilterBar({
  activeFilter,
  onFilterChange,
  builderFilter,
  onBuilderChange,
  entityFilter,
  onEntityChange,
  builders,
  entities,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-border bg-surface-raised px-4 py-3">
      {/* Signal pills */}
      <div className="flex flex-wrap gap-1.5">
        {PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => onFilterChange(pill.value)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-fast ${
              activeFilter === pill.value
                ? "bg-accent-primary/15 text-accent-primary border border-accent-primary/30"
                : "bg-surface-overlay text-text-secondary hover:bg-surface-border-subtle border border-transparent"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Dropdowns */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] uppercase tracking-wider text-text-muted">
          Builder
        </label>
        <select
          value={builderFilter ?? ""}
          onChange={(e) => onBuilderChange(e.target.value || null)}
          className="rounded-md border border-surface-border bg-surface-overlay px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-primary/40"
        >
          <option value="">All</option>
          {builders.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <label className="ml-2 text-[10px] uppercase tracking-wider text-text-muted">
          Entity
        </label>
        <select
          value={entityFilter ?? ""}
          onChange={(e) => onEntityChange(e.target.value || null)}
          className="rounded-md border border-surface-border bg-surface-overlay px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-primary/40"
        >
          <option value="">All</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/molecules/FilterBar.tsx
git commit -m "feat(contracts): add FilterBar molecule — signal pills + builder/entity dropdowns"
```

---

## Task 6: ActivityFeed Organism

**Files:**

- Create: `apps/web/src/components/organisms/ActivityFeed.tsx`

**Context:** Section 4 of the spec. Reverse-chronological event stream grouped by time period (Today, Yesterday, This Week, Earlier). Each item has a color-coded dot (from `FEED_EVENT_COLORS`), optional pulse animation (from `FEED_EVENT_PULSE`), title, optional badge (RFI/CORRECTION/ANOMALY), meta row (vault name bold + entity + builder + relative time), detail text, and hover-reveal arrow. Uses `FeedItem` type.

**Step 1: Create the ActivityFeed component**

```typescript
"use client";

import { ArrowRight } from "lucide-react";
import {
  FEED_EVENT_COLORS,
  FEED_EVENT_PULSE,
  type FeedItem,
  type FeedEventType,
} from "@/lib/mock-review-queue";

interface ActivityFeedProps {
  items: FeedItem[];
}

const BADGE_COLORS: Record<string, string> = {
  RFI: "bg-accent-warning/15 text-accent-warning",
  CORRECTION: "bg-accent-secondary/15 text-accent-secondary",
  ANOMALY: "bg-accent-danger/15 text-accent-danger",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getTimePeriod(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This Week";
  return "Earlier";
}

function groupByPeriod(items: FeedItem[]): Map<string, FeedItem[]> {
  const groups = new Map<string, FeedItem[]>();
  const order = ["Today", "Yesterday", "This Week", "Earlier"];

  for (const period of order) {
    const matched = items.filter((i) => getTimePeriod(i.timestamp) === period);
    if (matched.length > 0) groups.set(period, matched);
  }

  return groups;
}

function FeedItemRow({ item }: { item: FeedItem }) {
  const dotColor = FEED_EVENT_COLORS[item.eventType as FeedEventType] ?? "bg-text-muted";
  const pulse = FEED_EVENT_PULSE[item.eventType as FeedEventType] ?? false;

  return (
    <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 cursor-pointer hover:bg-surface-overlay transition-colors duration-fast">
      {/* Dot */}
      <div className="mt-1.5 flex-shrink-0">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor} ${
            pulse ? "animate-pulse" : ""
          }`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{item.title}</span>
          {item.badge && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                BADGE_COLORS[item.badge] ?? "bg-surface-overlay text-text-muted"
              }`}
            >
              {item.badge}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
          <span className="font-medium text-text-secondary">{item.vaultName}</span>
          <span>·</span>
          <span>{item.entityName}</span>
          <span>·</span>
          <span>{item.builderName}</span>
          <span>·</span>
          <span>{relativeTime(item.timestamp)}</span>
        </div>

        {/* Detail */}
        <p className="mt-0.5 text-xs text-text-muted">{item.detail}</p>
      </div>

      {/* Hover arrow */}
      <ArrowRight
        size={14}
        className="mt-1.5 flex-shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
      />
    </div>
  );
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-surface-border bg-surface-raised py-12">
        <span className="text-sm text-text-muted">No matching events</span>
      </div>
    );
  }

  const groups = groupByPeriod(items);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised">
      {[...groups.entries()].map(([period, groupItems]) => (
        <div key={period}>
          {/* Period header */}
          <div className="sticky top-0 z-[1] border-b border-surface-border-subtle bg-surface-raised px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {period}
            </span>
          </div>

          {/* Items */}
          <div className="flex flex-col">
            {groupItems.map((item) => (
              <FeedItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Type-check**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/ActivityFeed.tsx
git commit -m "feat(contracts): add ActivityFeed organism — grouped event stream with dots and badges"
```

---

## Task 7: ReviewQueuePage at /contracts/review-queue

**Files:**

- Create: `apps/web/src/app/(shell)/(modules)/contracts/review-queue/page.tsx`

**Context:** Full-width dashboard page (no triptych). Connects all components: parent vault cards in a horizontal grid, handoff signal panels in a 3-column grid, filter bar, and activity feed. Uses the ReviewQueue store for state + filtering. The `fetchReviewQueue` is called in a `useEffect`. Feed items are filtered client-side by `activeFilter`, `builderFilter`, and `entityFilter`. Review chamber = purple theme accent.

**Step 1: Create the page**

```typescript
"use client";

import { useEffect, useMemo } from "react";
import { useReviewQueueStore } from "@/stores/review-queue.store";
import { MOCK_BUILDERS } from "@/lib/mock-review-queue";
import type { FeedItem, FeedEventType } from "@/lib/mock-review-queue";
import EntityCard from "@/components/organisms/EntityCard";
import HandoffSignalPanel from "@/components/molecules/HandoffSignalPanel";
import FilterBar from "@/components/molecules/FilterBar";
import ActivityFeed from "@/components/organisms/ActivityFeed";

/** Map filter pill value → matching event type prefixes */
const FILTER_PREFIX: Record<string, string[]> = {
  patch: ["patch."],
  rfi: ["rfi."],
  correction: ["correction."],
  anomaly: ["anomaly."],
  activity: ["activity."],
  escalation: ["escalation."],
};

export default function ReviewQueuePage() {
  const {
    parentVaults,
    signals,
    feedItems,
    isLoading,
    expandedCards,
    activeFilter,
    builderFilter,
    entityFilter,
    fetchReviewQueue,
    toggleCard,
    setActiveFilter,
    setBuilderFilter,
    setEntityFilter,
  } = useReviewQueueStore();

  useEffect(() => {
    fetchReviewQueue();
  }, [fetchReviewQueue]);

  // Derive entity names from parent vaults for filter dropdown
  const entityNames = useMemo(
    () => parentVaults.map((pv) => pv.name),
    [parentVaults],
  );

  // Filter feed items based on active filters
  const filteredFeed = useMemo(() => {
    let items = feedItems;

    // Signal type filter
    if (activeFilter !== "all") {
      const prefixes = FILTER_PREFIX[activeFilter] ?? [];
      items = items.filter((item) =>
        prefixes.some((p) => item.eventType.startsWith(p)),
      );
    }

    // Builder filter
    if (builderFilter) {
      items = items.filter((item) => item.builderName === builderFilter);
    }

    // Entity filter
    if (entityFilter) {
      items = items.filter((item) => item.entityName === entityFilter);
    }

    return items;
  }, [feedItems, activeFilter, builderFilter, entityFilter]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted">Loading review queue...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Review Queue</h1>
          <p className="text-xs text-text-muted">
            Cross-vault review dashboard — Review chamber
          </p>
        </div>
        <span className="rounded-full bg-chamber-review/15 px-3 py-1 text-xs font-medium text-chamber-review">
          Review
        </span>
      </div>

      {/* Section 1: Parent Vault Cards */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Parent Vault Entities
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {parentVaults.map((card) => (
            <EntityCard
              key={card.id}
              card={card}
              expanded={expandedCards.has(card.id)}
              onToggle={() => toggleCard(card.id)}
            />
          ))}
        </div>
      </section>

      {/* Section 2: Handoff Signals */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Handoff Signals
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {signals.map((signal) => (
            <HandoffSignalPanel key={signal.type} signal={signal} />
          ))}
        </div>
      </section>

      {/* Section 3: Filter Bar */}
      <section>
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          builderFilter={builderFilter}
          onBuilderChange={setBuilderFilter}
          entityFilter={entityFilter}
          onEntityChange={setEntityFilter}
          builders={MOCK_BUILDERS}
          entities={entityNames}
        />
      </section>

      {/* Section 4: Activity Feed */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Activity Feed
        </h2>
        <ActivityFeed items={filteredFeed} />
      </section>
    </div>
  );
}
```

**Step 2: Type-check + lint**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/app/(shell)/(modules)/contracts/review-queue/page.tsx
git commit -m "feat(contracts): add ReviewQueuePage — full-width gatekeeper dashboard"
```

---

## Task 8: Final Verification + Component Registry

**Files:**

- Modify: `docs/registry/components.json` (add new components)

**Step 1: Run type-check and lint**

Run: `cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint`
Expected: PASS (clean)

**Step 2: Update component registry**

Add the following entries to `docs/registry/components.json`:

- `EntityCard` — organism — `src/components/organisms/EntityCard.tsx`
- `HandoffSignalPanel` — molecule — `src/components/molecules/HandoffSignalPanel.tsx`
- `FilterBar` — molecule — `src/components/molecules/FilterBar.tsx`
- `ActivityFeed` — organism — `src/components/organisms/ActivityFeed.tsx`

**Step 3: Commit**

```bash
git add docs/registry/components.json
git commit -m "docs: register M9 Review Queue components in registry"
```

---

## Dependency Graph

```
Task 1 (mock data) ──┬── Task 2 (store) ─────────────────────┐
                      ├── Task 3 (EntityCard)                  │
                      ├── Task 4 (HandoffSignalPanel)          ├── Task 7 (page)
                      ├── Task 5 (FilterBar)                   │
                      └── Task 6 (ActivityFeed)  ──────────────┘
                                                               └── Task 8 (verify)
```

**Parallelizable batches:**

- Batch 1: Task 1
- Batch 2: Tasks 2 + 3 + 4 + 5 + 6 (all depend only on Task 1 types)
- Batch 3: Task 7 (depends on Tasks 2-6)
- Batch 4: Task 8 (depends on Task 7)
