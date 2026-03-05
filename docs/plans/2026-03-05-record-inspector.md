# Record Inspector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the card-based Record Inspector view for the Orchestrate panel — field cards with expandable drawers, section grouping, tier expansion, confidence badges, status dots, and heatmap toggle, all powered by mock extraction data.

**Architecture:** Mock extraction data provides field-level records grouped by 5 preflight sections. A Zustand extraction store holds fields per vault with mock fallback. The UI is built as atomic components (ConfidenceBadge, StatusDot atoms; FieldCard molecule; SectionGroup, RecordInspector organisms) that compose into the vault detail page, replacing the current basic metadata view.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Zustand, Tailwind CSS tokens

---

## Context

**Existing files you need to know about:**

- `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/page.tsx` — Current vault detail page (basic header + metadata grid). This gets replaced with the Record Inspector.
- `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/layout.tsx` — Vault layout wrapping TriptychLayout. Passes `vaultId` prop.
- `apps/web/src/components/templates/TriptychLayout.tsx` — Three-panel layout. Record Inspector lives in the Orchestrate (center) panel as `children`.
- `apps/web/src/components/atoms/GateDot.tsx` — Existing colored dot component (discover/build/review/ship). Pattern reference for StatusDot.
- `apps/web/src/stores/vault.store.ts` — Vault CRUD + mock fallback. Pattern reference for extraction store.
- `apps/web/src/lib/mock-vaults.ts` — 7 mock vaults. Pattern reference for mock extraction data.
- `apps/web/src/lib/api.ts` — `apiFetch<T>(path, options)` function for API calls.
- `apps/web/src/styles/tokens.css` — All design tokens. Available Tailwind classes: `bg-surface-*`, `text-text-*`, `border-surface-border`, `bg-gate-green`, `bg-gate-amber`, `bg-gate-red`, `bg-accent-*`, etc.

**Spec source:** `docs/specs/record-inspector/overview.md` and `docs/specs/record-inspector/field-cards.md`

**What's NOT in scope (later milestones):**

- Document Viewer (PDF rendering, scroll sync)
- Entity resolution (Signal panel disambiguation)
- Spotlight mode (blur/focus + Artifact Focus trigger)
- Cross-panel scroll sync
- Real extraction engine (backend)

---

### Task 1: Mock Extraction Data

**Files:**

- Create: `apps/web/src/lib/mock-extractions.ts`

**Step 1: Write the mock data file**

This file defines the extraction field types and provides mock data for 2 vaults (vault_004 and vault_006 from mock-vaults — they're in Build and Review chambers so they'd realistically have extraction data).

```typescript
/**
 * Mock extraction data for dev preview.
 * Simulates output from the 7-extractor pipeline + preflight engine.
 */

export type FieldStatus = "pass" | "review" | "fail" | "missing" | "suggested";
export type ConfidenceTier = "HIGH" | "MED" | "LOW";
export type ExtractorType =
  | "boolean"
  | "split"
  | "picklist"
  | "date"
  | "pattern"
  | "text"
  | "entity";

export interface ExtractionField {
  id: string;
  field_name: string;
  extracted_value: string;
  status: FieldStatus;
  confidence: number;
  confidence_tier: ConfidenceTier;
  tier: 1 | 2;
  section: string;
  extractor_type: ExtractorType;
  anchor_matched: string;
  evidence_context: string;
}

export interface VaultExtraction {
  vault_id: string;
  sections: {
    name: string;
    weight: number;
    sort_order: number;
    fields: ExtractionField[];
  }[];
}

function confidenceTier(c: number): ConfidenceTier {
  if (c >= 0.75) return "HIGH";
  if (c >= 0.4) return "MED";
  return "LOW";
}

const SONY_FIELDS: ExtractionField[] = [
  // Entity Resolution section
  {
    id: "f_001",
    field_name: "Licensor Legal Name",
    extracted_value: "Sony Music Entertainment Inc.",
    status: "pass",
    confidence: 0.95,
    confidence_tier: confidenceTier(0.95),
    tier: 1,
    section: "Entity Resolution",
    extractor_type: "entity",
    anchor_matched: "LICENSOR:",
    evidence_context:
      'This Agreement is entered into by and between <mark>Sony Music Entertainment Inc.</mark> ("Licensor") and BigBooty Records LLC ("Licensee").',
  },
  {
    id: "f_002",
    field_name: "Licensee Legal Name",
    extracted_value: "BigBooty Records LLC",
    status: "pass",
    confidence: 0.93,
    confidence_tier: confidenceTier(0.93),
    tier: 1,
    section: "Entity Resolution",
    extractor_type: "entity",
    anchor_matched: "LICENSEE:",
    evidence_context:
      'Sony Music Entertainment Inc. ("Licensor") and <mark>BigBooty Records LLC</mark> ("Licensee"), collectively the "Parties".',
  },
  {
    id: "f_003",
    field_name: "Licensor Address",
    extracted_value: "25 Madison Avenue, New York, NY 10010",
    status: "pass",
    confidence: 0.78,
    confidence_tier: confidenceTier(0.78),
    tier: 2,
    section: "Entity Resolution",
    extractor_type: "text",
    anchor_matched: "principal place of business",
    evidence_context:
      "with its <mark>principal place of business at 25 Madison Avenue, New York, NY 10010</mark>.",
  },
  // Opportunities section
  {
    id: "f_004",
    field_name: "Contract Type",
    extracted_value: "Distribution",
    status: "pass",
    confidence: 0.98,
    confidence_tier: confidenceTier(0.98),
    tier: 1,
    section: "Opportunities",
    extractor_type: "picklist",
    anchor_matched: "DISTRIBUTION AGREEMENT",
    evidence_context:
      'This <mark>DISTRIBUTION AGREEMENT</mark> (the "Agreement") is effective as of the date set forth below.',
  },
  {
    id: "f_005",
    field_name: "Territory",
    extracted_value: "Worldwide",
    status: "pass",
    confidence: 0.91,
    confidence_tier: confidenceTier(0.91),
    tier: 1,
    section: "Opportunities",
    extractor_type: "picklist",
    anchor_matched: "Territory",
    evidence_context:
      'The territory covered by this Agreement shall be <mark>Worldwide</mark> (the "Territory").',
  },
  {
    id: "f_006",
    field_name: "Exclusivity",
    extracted_value: "Exclusive",
    status: "review",
    confidence: 0.62,
    confidence_tier: confidenceTier(0.62),
    tier: 1,
    section: "Opportunities",
    extractor_type: "boolean",
    anchor_matched: "exclusive",
    evidence_context:
      "Licensor hereby grants Licensee an <mark>exclusive</mark> right to distribute... subject to carve-outs in Exhibit B.",
  },
  {
    id: "f_007",
    field_name: "Sub-licensing Permitted",
    extracted_value: "No",
    status: "pass",
    confidence: 0.85,
    confidence_tier: confidenceTier(0.85),
    tier: 2,
    section: "Opportunities",
    extractor_type: "boolean",
    anchor_matched: "sub-licens",
    evidence_context:
      "Licensee shall <mark>not sub-license</mark> any rights granted hereunder without prior written consent.",
  },
  // Schedule section
  {
    id: "f_008",
    field_name: "Effective Date",
    extracted_value: "2026-01-15",
    status: "pass",
    confidence: 0.97,
    confidence_tier: confidenceTier(0.97),
    tier: 1,
    section: "Schedule",
    extractor_type: "date",
    anchor_matched: "Effective Date",
    evidence_context:
      'This Agreement shall commence on the <mark>Effective Date of January 15, 2026</mark> (the "Effective Date").',
  },
  {
    id: "f_009",
    field_name: "Term Duration",
    extracted_value: "3 years",
    status: "pass",
    confidence: 0.88,
    confidence_tier: confidenceTier(0.88),
    tier: 1,
    section: "Schedule",
    extractor_type: "pattern",
    anchor_matched: "term of",
    evidence_context:
      "The initial <mark>term of this Agreement shall be three (3) years</mark> from the Effective Date.",
  },
  {
    id: "f_010",
    field_name: "Auto-Renewal",
    extracted_value: "Yes — 1-year periods",
    status: "review",
    confidence: 0.55,
    confidence_tier: confidenceTier(0.55),
    tier: 2,
    section: "Schedule",
    extractor_type: "boolean",
    anchor_matched: "auto-renew",
    evidence_context:
      "This Agreement shall <mark>automatically renew for successive one (1) year periods</mark> unless either party provides 90 days written notice.",
  },
  // Financials section
  {
    id: "f_011",
    field_name: "Distribution Fee",
    extracted_value: "15%",
    status: "pass",
    confidence: 0.94,
    confidence_tier: confidenceTier(0.94),
    tier: 1,
    section: "Financials",
    extractor_type: "pattern",
    anchor_matched: "distribution fee",
    evidence_context:
      "Licensee shall receive a <mark>distribution fee of fifteen percent (15%)</mark> of Net Receipts.",
  },
  {
    id: "f_012",
    field_name: "Minimum Guarantee",
    extracted_value: "$500,000",
    status: "pass",
    confidence: 0.89,
    confidence_tier: confidenceTier(0.89),
    tier: 1,
    section: "Financials",
    extractor_type: "pattern",
    anchor_matched: "minimum guarantee",
    evidence_context:
      "Licensee shall pay a non-refundable <mark>minimum guarantee of Five Hundred Thousand Dollars ($500,000)</mark> upon execution.",
  },
  {
    id: "f_013",
    field_name: "Payment Terms",
    extracted_value: "Net 60",
    status: "review",
    confidence: 0.48,
    confidence_tier: confidenceTier(0.48),
    tier: 1,
    section: "Financials",
    extractor_type: "text",
    anchor_matched: "payment",
    evidence_context:
      "Royalty statements and <mark>payments shall be rendered within sixty (60) days</mark> following the end of each accounting period.",
  },
  {
    id: "f_014",
    field_name: "Audit Rights",
    extracted_value: "Yes — annual",
    status: "pass",
    confidence: 0.82,
    confidence_tier: confidenceTier(0.82),
    tier: 2,
    section: "Financials",
    extractor_type: "boolean",
    anchor_matched: "audit",
    evidence_context:
      "Licensor shall have the right to <mark>audit Licensee's books once per calendar year</mark> upon 30 days' notice.",
  },
  // Addons section
  {
    id: "f_015",
    field_name: "Governing Law",
    extracted_value: "New York",
    status: "pass",
    confidence: 0.96,
    confidence_tier: confidenceTier(0.96),
    tier: 1,
    section: "Addons",
    extractor_type: "picklist",
    anchor_matched: "governed by the laws",
    evidence_context:
      "This Agreement shall be <mark>governed by the laws of the State of New York</mark> without regard to conflicts of law.",
  },
  {
    id: "f_016",
    field_name: "Dispute Resolution",
    extracted_value: "Arbitration — AAA",
    status: "suggested",
    confidence: 0.35,
    confidence_tier: confidenceTier(0.35),
    tier: 2,
    section: "Addons",
    extractor_type: "text",
    anchor_matched: "dispute",
    evidence_context:
      "Any <mark>dispute arising under this Agreement shall be resolved by binding arbitration</mark> administered by the American Arbitration Association.",
  },
  {
    id: "f_017",
    field_name: "Force Majeure",
    extracted_value: "--",
    status: "missing",
    confidence: 0,
    confidence_tier: confidenceTier(0),
    tier: 2,
    section: "Addons",
    extractor_type: "text",
    anchor_matched: "",
    evidence_context: "",
  },
];

const SECTIONS = [
  { name: "Entity Resolution", weight: 0.2, sort_order: 1 },
  { name: "Opportunities", weight: 0.25, sort_order: 2 },
  { name: "Schedule", weight: 0.15, sort_order: 3 },
  { name: "Financials", weight: 0.25, sort_order: 4 },
  { name: "Addons", weight: 0.15, sort_order: 5 },
];

function buildExtraction(
  vaultId: string,
  fields: ExtractionField[],
): VaultExtraction {
  return {
    vault_id: vaultId,
    sections: SECTIONS.map((s) => ({
      ...s,
      fields: fields.filter((f) => f.section === s.name),
    })),
  };
}

export const MOCK_EXTRACTIONS: Record<string, VaultExtraction> = {
  vault_004: buildExtraction("vault_004", SONY_FIELDS),
  // vault_006 reuses same fields with vault_id changed (good enough for mock)
  vault_006: buildExtraction("vault_006", SONY_FIELDS),
};
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/mock-extractions.ts
git commit -m "feat(web): add mock extraction data for Record Inspector"
```

---

### Task 2: Extraction Store

**Files:**

- Create: `apps/web/src/stores/extraction.store.ts`

**Step 1: Write the store**

Follow the pattern from `vault.store.ts` and `event.store.ts` — try API, fall back to mock.

```typescript
import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { MOCK_EXTRACTIONS, type VaultExtraction } from "@/lib/mock-extractions";

interface ExtractionState {
  extraction: VaultExtraction | null;
  isLoading: boolean;
  error: string | null;
  heatmapEnabled: boolean;

  fetchExtraction: (vaultId: string) => Promise<void>;
  toggleHeatmap: () => void;
  clearExtraction: () => void;
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  extraction: null,
  isLoading: false,
  error: null,
  heatmapEnabled: false,

  fetchExtraction: async (vaultId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<VaultExtraction>(
        `/api/v1/extractions/${vaultId}`,
      );
      set({ extraction: data, isLoading: false });
    } catch {
      const mock = MOCK_EXTRACTIONS[vaultId] ?? null;
      set({ extraction: mock, isLoading: false, error: null });
    }
  },

  toggleHeatmap: () =>
    set((state) => ({ heatmapEnabled: !state.heatmapEnabled })),

  clearExtraction: () =>
    set({ extraction: null, isLoading: false, error: null }),
}));
```

**Step 2: Commit**

```bash
git add apps/web/src/stores/extraction.store.ts
git commit -m "feat(web): add extraction Zustand store with mock fallback"
```

---

### Task 3: StatusDot and ConfidenceBadge Atoms

**Files:**

- Create: `apps/web/src/components/atoms/StatusDot.tsx`
- Create: `apps/web/src/components/atoms/ConfidenceBadge.tsx`

**Step 1: Create StatusDot**

Pattern: follows `GateDot.tsx` (existing atom). Maps field status to dot color.

```tsx
import type { FieldStatus } from "@/lib/mock-extractions";

const statusColorMap: Record<FieldStatus, string> = {
  pass: "bg-gate-green",
  review: "bg-gate-amber",
  fail: "bg-gate-red",
  missing: "bg-text-muted",
  suggested: "bg-accent-primary",
};

interface StatusDotProps {
  status: FieldStatus;
  className?: string;
}

export default function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${statusColorMap[status]} ${className ?? ""}`}
      aria-label={`${status} status`}
    />
  );
}
```

**Step 2: Create ConfidenceBadge**

```tsx
import type { ConfidenceTier } from "@/lib/mock-extractions";

const tierStyles: Record<ConfidenceTier, string> = {
  HIGH: "bg-gate-green/20 text-gate-green",
  MED: "bg-gate-amber/20 text-gate-amber",
  LOW: "bg-gate-red/20 text-gate-red",
};

interface ConfidenceBadgeProps {
  tier: ConfidenceTier;
  className?: string;
}

export default function ConfidenceBadge({
  tier,
  className,
}: ConfidenceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${tierStyles[tier]} ${className ?? ""}`}
    >
      {tier}
    </span>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/atoms/StatusDot.tsx apps/web/src/components/atoms/ConfidenceBadge.tsx
git commit -m "feat(web): add StatusDot and ConfidenceBadge atoms"
```

---

### Task 4: FieldCard Molecule

**Files:**

- Create: `apps/web/src/components/molecules/FieldCard.tsx`

**Step 1: Write the component**

Collapsed state: single row with status dot, field name, extracted value, confidence badge.
Expanded state (drawer): evidence context, anchor info, extractor type, confidence bar.

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import StatusDot from "@/components/atoms/StatusDot";
import ConfidenceBadge from "@/components/atoms/ConfidenceBadge";
import type { ExtractionField } from "@/lib/mock-extractions";

interface FieldCardProps {
  field: ExtractionField;
  heatmapEnabled: boolean;
}

const heatmapBg: Record<string, string> = {
  HIGH: "bg-gate-green/5",
  MED: "bg-gate-amber/5",
  LOW: "bg-gate-red/5",
};

const confidenceBarColor: Record<string, string> = {
  HIGH: "bg-gate-green",
  MED: "bg-gate-amber",
  LOW: "bg-gate-red",
};

export default function FieldCard({ field, heatmapEnabled }: FieldCardProps) {
  const [expanded, setExpanded] = useState(false);

  const bgClass = heatmapEnabled
    ? (heatmapBg[field.confidence_tier] ?? "")
    : "";

  return (
    <div
      className={`rounded-md border border-surface-border ${bgClass || "bg-surface-overlay"} transition-colors duration-fast`}
    >
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
      >
        <StatusDot status={field.status} />
        {expanded ? (
          <ChevronDown size={14} className="flex-shrink-0 text-text-muted" />
        ) : (
          <ChevronRight size={14} className="flex-shrink-0 text-text-muted" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">
          {field.field_name}
        </span>
        <span className="max-w-[200px] truncate text-right font-mono text-xs text-text-secondary">
          {field.extracted_value}
        </span>
        <ConfidenceBadge tier={field.confidence_tier} />
      </button>

      {/* Drawer (expanded) */}
      {expanded && (
        <div className="border-t border-surface-border px-4 py-3">
          {/* Evidence context */}
          {field.evidence_context && (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Evidence
              </p>
              <p
                className="rounded bg-surface-sunken px-2 py-1.5 font-mono text-xs leading-relaxed text-text-secondary"
                dangerouslySetInnerHTML={{ __html: field.evidence_context }}
              />
            </div>
          )}

          {/* Anchor + Extractor row */}
          <div className="mb-3 flex gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Anchor
              </p>
              <p className="font-mono text-xs text-text-secondary">
                {field.anchor_matched || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Extractor
              </p>
              <p className="text-xs capitalize text-text-secondary">
                {field.extractor_type}
              </p>
            </div>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Confidence
              </p>
              <span className="font-mono text-xs text-text-secondary">
                {field.confidence.toFixed(2)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-sunken">
              <div
                className={`h-1.5 rounded-full ${confidenceBarColor[field.confidence_tier]}`}
                style={{ width: `${Math.round(field.confidence * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/molecules/FieldCard.tsx
git commit -m "feat(web): add FieldCard molecule with expandable drawer"
```

---

### Task 5: SectionGroup Organism

**Files:**

- Create: `apps/web/src/components/organisms/SectionGroup.tsx`

**Step 1: Write the component**

Section header with name, weight percentage, aggregate status counts, and collapse toggle. Tier 1 fields visible by default; "N more fields" divider reveals Tier 2.

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import FieldCard from "@/components/molecules/FieldCard";
import type { ExtractionField, FieldStatus } from "@/lib/mock-extractions";

interface SectionGroupProps {
  name: string;
  weight: number;
  fields: ExtractionField[];
  heatmapEnabled: boolean;
}

function statusCount(fields: ExtractionField[], status: FieldStatus): number {
  return fields.filter((f) => f.status === status).length;
}

export default function SectionGroup({
  name,
  weight,
  fields,
  heatmapEnabled,
}: SectionGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showTier2, setShowTier2] = useState(false);

  const tier1 = fields.filter((f) => f.tier === 1);
  const tier2 = fields.filter((f) => f.tier === 2);

  const passCount = statusCount(fields, "pass");
  const reviewCount = statusCount(fields, "review");
  const failCount = statusCount(fields, "fail");
  const missingCount = statusCount(fields, "missing");

  return (
    <div className="mb-4">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-surface-overlay"
      >
        {collapsed ? (
          <ChevronRight size={16} className="text-text-muted" />
        ) : (
          <ChevronDown size={16} className="text-text-muted" />
        )}
        <span className="text-sm font-semibold text-text-primary">{name}</span>
        <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          {Math.round(weight * 100)}%
        </span>
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          {passCount > 0 && (
            <span className="text-gate-green">{passCount} pass</span>
          )}
          {reviewCount > 0 && (
            <span className="text-gate-amber">{reviewCount} review</span>
          )}
          {failCount > 0 && (
            <span className="text-gate-red">{failCount} fail</span>
          )}
          {missingCount > 0 && (
            <span className="text-text-muted">{missingCount} missing</span>
          )}
        </div>
      </button>

      {/* Field cards */}
      {!collapsed && (
        <div className="mt-1 flex flex-col gap-1.5 pl-2">
          {tier1.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              heatmapEnabled={heatmapEnabled}
            />
          ))}

          {tier2.length > 0 && !showTier2 && (
            <button
              onClick={() => setShowTier2(true)}
              className="cursor-pointer rounded-md border border-dashed border-surface-border px-3 py-1.5 text-center text-xs text-text-muted transition-colors hover:border-accent-primary/30 hover:text-text-secondary"
            >
              {tier2.length} more field{tier2.length !== 1 ? "s" : ""}
            </button>
          )}

          {showTier2 &&
            tier2.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                heatmapEnabled={heatmapEnabled}
              />
            ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/organisms/SectionGroup.tsx
git commit -m "feat(web): add SectionGroup organism with tier expansion"
```

---

### Task 6: RecordInspector Organism

**Files:**

- Create: `apps/web/src/components/organisms/RecordInspector.tsx`

**Step 1: Write the component**

Top-level component with a toolbar (heatmap toggle) and renders SectionGroups from extraction data. Shows loading/empty states.

```tsx
"use client";

import { useEffect } from "react";
import { Flame } from "lucide-react";
import { useExtractionStore } from "@/stores/extraction.store";
import SectionGroup from "@/components/organisms/SectionGroup";

interface RecordInspectorProps {
  vaultId: string;
}

export default function RecordInspector({ vaultId }: RecordInspectorProps) {
  const {
    extraction,
    isLoading,
    heatmapEnabled,
    fetchExtraction,
    toggleHeatmap,
  } = useExtractionStore();

  useEffect(() => {
    fetchExtraction(vaultId);
  }, [vaultId, fetchExtraction]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-md bg-surface-overlay"
          />
        ))}
      </div>
    );
  }

  if (!extraction) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">
          No extraction data available for this vault.
        </p>
      </div>
    );
  }

  const totalFields = extraction.sections.reduce(
    (sum, s) => sum + s.fields.length,
    0,
  );

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Record Inspector
          </span>
          <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
            {totalFields} fields
          </span>
        </div>
        <button
          onClick={toggleHeatmap}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
            heatmapEnabled
              ? "bg-gate-amber/20 text-gate-amber"
              : "text-text-muted hover:text-text-secondary"
          }`}
          title="Toggle confidence heatmap"
        >
          <Flame size={14} />
          Heatmap
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-4">
        {extraction.sections.map((section) => (
          <SectionGroup
            key={section.name}
            name={section.name}
            weight={section.weight}
            fields={section.fields}
            heatmapEnabled={heatmapEnabled}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/organisms/RecordInspector.tsx
git commit -m "feat(web): add RecordInspector organism with heatmap toggle"
```

---

### Task 7: Wire Record Inspector into Vault Detail Page

**Files:**

- Modify: `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/page.tsx`

**Step 1: Rewrite the vault detail page**

Replace the current basic metadata view with the vault header (kept from M4) + RecordInspector as the main content.

```tsx
"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import GateDot from "@/components/atoms/GateDot";
import RecordInspector from "@/components/organisms/RecordInspector";
import { useVaultStore } from "@/stores/vault.store";
import type { Chamber } from "@/stores/vault.store";

export default function VaultDetailPage() {
  const params = useParams<{ vaultId: string }>();
  const { selectedVault, fetchVault, isLoading } = useVaultStore();

  useEffect(() => {
    if (params.vaultId) {
      fetchVault(params.vaultId);
    }
  }, [params.vaultId, fetchVault]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">Loading vault...</p>
      </div>
    );
  }

  if (!selectedVault) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">Vault not found</p>
      </div>
    );
  }

  const entity =
    (selectedVault.metadata as Record<string, string>).entity || "";
  const contractType =
    (selectedVault.metadata as Record<string, string>).contract_type || "";
  const healthColor =
    (selectedVault.health_score ?? 0) >= 80
      ? "text-gate-green"
      : (selectedVault.health_score ?? 0) >= 50
        ? "text-gate-yellow"
        : "text-gate-red";

  return (
    <div className="flex h-full flex-col">
      {/* Vault header */}
      <div className="flex-shrink-0 border-b border-surface-border px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <GateDot
                gate={(selectedVault.chamber as Chamber) || "discover"}
                className="h-3 w-3"
              />
              <h2 className="text-lg font-semibold text-text-primary">
                {selectedVault.name}
              </h2>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {entity}
              {contractType ? ` — ${contractType}` : ""}
            </p>
          </div>
          <div className="text-right">
            <span className={`font-mono text-lg font-bold ${healthColor}`}>
              {selectedVault.health_score ?? 0}%
            </span>
            <p className="text-xs text-text-muted">Health Score</p>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-3 flex gap-4 text-xs">
          <div>
            <span className="text-text-muted">Chamber </span>
            <span className="font-medium capitalize text-text-primary">
              {selectedVault.chamber || "—"}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Gate </span>
            <span className="font-medium text-text-primary">
              {selectedVault.gate?.replace("gate_", "") || "—"}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Type </span>
            <span className="font-medium capitalize text-text-primary">
              {selectedVault.vault_type}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Slug </span>
            <span className="font-mono text-text-secondary">
              {selectedVault.slug}
            </span>
          </div>
        </div>
      </div>

      {/* Record Inspector */}
      <div className="flex-1 overflow-hidden">
        <RecordInspector vaultId={selectedVault.id} />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add "apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/page.tsx"
git commit -m "feat(contracts): wire Record Inspector into vault detail page"
```

---

### Task 8: Lint + Type-Check Verification

**Step 1: Run frontend type-check**

Run: `cd apps/web && source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: No errors

**Step 2: Run backend tests (regression check)**

Run: `cd apps/api && source .venv/bin/activate && pytest tests/ -v`
Expected: All 36 tests pass

**Step 3: Fix any issues and commit if needed**

---

## Summary

| Task | Component                   | What It Does                                          |
| ---- | --------------------------- | ----------------------------------------------------- |
| 1    | Mock extraction data        | 17 fields across 5 sections for 2 vaults              |
| 2    | Extraction store            | Zustand store with API + mock fallback, heatmap state |
| 3    | StatusDot + ConfidenceBadge | Atom components for field status and confidence       |
| 4    | FieldCard                   | Molecule with collapsed row + expandable drawer       |
| 5    | SectionGroup                | Organism with header stats, tier 1/2 expansion        |
| 6    | RecordInspector             | Top-level organism with toolbar + section list        |
| 7    | Vault detail page           | Wire RecordInspector into contracts/[vaultId]         |
| 8    | Verification                | Lint + type-check + test regression                   |

**After this milestone:**

- Vault detail pages show field-level extraction data grouped by section
- Cards expand to reveal evidence, anchor, extractor, and confidence bar
- Heatmap toggle overlays confidence colors on all cards
- Tier 2 fields hidden behind "N more fields" divider
- Full mock data for dev preview without API
