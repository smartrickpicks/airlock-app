# Contract Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the two-pane contract builder UI — contract type selector (24 types, 5 verticals), section-by-section form wizard, clause picker with risk badges, live markdown preview, and Zustand store.

**Architecture:** The Contract Generator uses a two-pane layout (Builder | Preview) rendered at `/contracts/generator`. Mock clause library and template data provide the UI scaffolding. The generator Zustand store tracks selected contract type, current wizard step, field values, selected clauses, and assembled preview. When real engines land (M14-16), the mock data swaps for API calls.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Zustand, Tailwind CSS tokens, Lucide icons

---

## Context for Implementers

### Vocabulary

- **Clause** — A reusable legal text block with `{{CHECK_CODE}}` variable placeholders
- **Template** — A contract type's section structure defining which clauses to use
- **Trigger** — A condition that determines which clause to select for a section
- **Vertical** — A grouping of contract types (Music Core, Music Ancillary, Film, TV, Cross-Entertainment)
- **Risk Level** — Clause safety rating: standard, elevated, critical, high

### Existing Patterns

- **Mock data pattern:** `src/lib/mock-*.ts` exports typed data
- **Store pattern:** `src/stores/*.store.ts` — Zustand with API fallback
- **Routing:** Pages at `src/app/(shell)/(modules)/contracts/<view>/page.tsx`
- **Sub-panel:** `src/components/organisms/SubPanel.tsx` already has `{ icon: PlusCircle, label: "Generator", path: "/contracts/generator" }`

### Key Files

- `src/lib/mock-extractions.ts` — Reference for mock data pattern
- `src/stores/extraction.store.ts` — Reference for store pattern
- `src/components/organisms/RecordInspector.tsx` — Reference for organism pattern
- `docs/specs/contract-generator/overview.md` — Full spec

### Commands

- **Type-check:** `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
- **Lint:** `source ~/.nvm/nvm.sh && nvm use 20 && pnpm lint`

---

### Task 1: Mock Clause Library + Template Data

**Files:**

- Create: `apps/web/src/lib/mock-clauses.ts`

**Step 1: Create clause types and mock data**

This file defines the clause library types (matching the v2 spec schema) and provides a representative subset of clauses for a Distribution Agreement template.

```typescript
/**
 * Mock clause library data for dev preview.
 * Represents a subset of the 188-clause unified library (v2).
 * Schema matches docs/specs/contract-generator/overview.md
 */

export type RiskLevel = "standard" | "elevated" | "critical" | "high";

export type ContractVertical =
  | "music_core"
  | "music_ancillary"
  | "film"
  | "tv"
  | "cross_entertainment";

export interface ContractTypeOption {
  id: string;
  label: string;
  vertical: ContractVertical;
}

export interface ClauseVariable {
  field: string;
  canonical_key: string;
  placeholder: string;
  default: string | null;
}

export interface ClauseTrigger {
  field: string;
  condition:
    | "equals"
    | "in"
    | "not_equals"
    | "exists"
    | "not_exists"
    | "contains"
    | "pattern"
    | "default";
  value?: string;
}

export interface Clause {
  clause_id: string;
  clause_type: string;
  version: number;
  contract_types: string[];
  section: string;
  risk_level: RiskLevel;
  body: string;
  variables: ClauseVariable[];
  triggers: ClauseTrigger[];
  generation_config: { priority: number; fallback: string };
}

export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  type: "boilerplate" | "conditional";
}

export interface ContractTemplate {
  template_id: string;
  contract_type: string;
  display_name: string;
  sections: TemplateSection[];
  required_fields: string[];
}

/** Vertical labels for display */
export const VERTICAL_LABELS: Record<ContractVertical, string> = {
  music_core: "Music Core",
  music_ancillary: "Music Ancillary",
  film: "Film",
  tv: "TV",
  cross_entertainment: "Cross-Entertainment",
};

/** All 24 contract types across 5 verticals */
export const CONTRACT_TYPES: ContractTypeOption[] = [
  // Music Core
  {
    id: "distribution",
    label: "Distribution Agreement",
    vertical: "music_core",
  },
  { id: "license", label: "License Agreement", vertical: "music_core" },
  { id: "recording", label: "Recording Agreement", vertical: "music_core" },
  { id: "publishing", label: "Publishing Agreement", vertical: "music_core" },
  // Music Ancillary
  { id: "producer", label: "Producer Agreement", vertical: "music_ancillary" },
  { id: "sync_license", label: "Sync License", vertical: "music_ancillary" },
  {
    id: "master_use",
    label: "Master Use License",
    vertical: "music_ancillary",
  },
  {
    id: "management",
    label: "Management Agreement",
    vertical: "music_ancillary",
  },
  {
    id: "co_publishing",
    label: "Co-Publishing Agreement",
    vertical: "music_ancillary",
  },
  {
    id: "sample_clearance",
    label: "Sample Clearance",
    vertical: "music_ancillary",
  },
  {
    id: "merchandise",
    label: "Merchandise Agreement",
    vertical: "music_ancillary",
  },
  // Film
  { id: "film_distribution", label: "Film Distribution", vertical: "film" },
  { id: "talent_actor", label: "Talent (Actor)", vertical: "film" },
  { id: "director", label: "Director Agreement", vertical: "film" },
  { id: "screenplay_option", label: "Screenplay Option", vertical: "film" },
  { id: "co_production", label: "Co-Production Agreement", vertical: "film" },
  // TV
  { id: "tv_distribution", label: "TV Distribution", vertical: "tv" },
  { id: "tv_talent", label: "TV Talent", vertical: "tv" },
  { id: "tv_development", label: "TV Development Deal", vertical: "tv" },
  { id: "tv_licensing", label: "TV Licensing", vertical: "tv" },
  // Cross-Entertainment
  {
    id: "nda",
    label: "Non-Disclosure Agreement",
    vertical: "cross_entertainment",
  },
  {
    id: "work_for_hire",
    label: "Work for Hire",
    vertical: "cross_entertainment",
  },
  {
    id: "assignment",
    label: "Assignment Agreement",
    vertical: "cross_entertainment",
  },
  {
    id: "termination",
    label: "Termination Agreement",
    vertical: "cross_entertainment",
  },
];

/** Distribution Agreement template — 8 sections */
export const DISTRIBUTION_TEMPLATE: ContractTemplate = {
  template_id: "distribution-standard-v1",
  contract_type: "distribution",
  display_name: "Distribution Agreement",
  sections: [
    { id: "recitals", title: "RECITALS", order: 1, type: "boilerplate" },
    {
      id: "scope",
      title: "1. SCOPE OF AGREEMENT",
      order: 2,
      type: "conditional",
    },
    {
      id: "term",
      title: "2. TERM AND TERRITORY",
      order: 3,
      type: "conditional",
    },
    {
      id: "compensation",
      title: "3. COMPENSATION",
      order: 4,
      type: "conditional",
    },
    {
      id: "delivery",
      title: "4. DELIVERY AND ACCEPTANCE",
      order: 5,
      type: "conditional",
    },
    {
      id: "representations",
      title: "5. REPRESENTATIONS AND WARRANTIES",
      order: 6,
      type: "boilerplate",
    },
    {
      id: "termination",
      title: "6. TERMINATION",
      order: 7,
      type: "conditional",
    },
    {
      id: "general",
      title: "7. GENERAL PROVISIONS",
      order: 8,
      type: "boilerplate",
    },
  ],
  required_fields: [
    "OPP_CONTRACT_TYPE",
    "OPP_TERRITORY",
    "OPP_TERM_LENGTH",
    "OPP_EFFECTIVE_DATE",
  ],
};

/** Mock templates keyed by contract type — only Distribution for now */
export const MOCK_TEMPLATES: Record<string, ContractTemplate> = {
  distribution: DISTRIBUTION_TEMPLATE,
};

/** Representative clause library — 10 clauses for Distribution */
export const MOCK_CLAUSES: Clause[] = [
  {
    clause_id: "GEN-RECITALS-DIST-V1",
    clause_type: "PARTIES_IDENTIFICATION",
    version: 1,
    contract_types: ["distribution"],
    section: "recitals",
    risk_level: "standard",
    body: 'This Distribution Agreement (the "Agreement") is entered into as of {{OPP_EFFECTIVE_DATE}} by and between {{ACCT_LEGAL_ENTITY}} ("Label") and {{ACCT_COUNTERPARTY}} ("Distributor").\n\nWHEREAS, Label is the owner or controller of certain sound recordings and musical compositions; and\n\nWHEREAS, Distributor desires to distribute such recordings in the Territory on the terms set forth herein.',
    variables: [
      {
        field: "OPP_EFFECTIVE_DATE",
        canonical_key: "Effective_Date__c",
        placeholder: "{{OPP_EFFECTIVE_DATE}}",
        default: null,
      },
      {
        field: "ACCT_LEGAL_ENTITY",
        canonical_key: "Legal_Entity__c",
        placeholder: "{{ACCT_LEGAL_ENTITY}}",
        default: null,
      },
      {
        field: "ACCT_COUNTERPARTY",
        canonical_key: "Counterparty__c",
        placeholder: "{{ACCT_COUNTERPARTY}}",
        default: null,
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-SCOPE-DIST-V1",
    clause_type: "SCOPE_OF_RIGHTS",
    version: 1,
    contract_types: ["distribution"],
    section: "scope",
    risk_level: "standard",
    body: "1.1 Label hereby grants to Distributor the {{OPP_EXCLUSIVITY}} right to distribute, market, and sell the Recordings in all formats, whether now known or hereafter devised, throughout the Territory.\n\n1.2 The rights granted herein include digital distribution, physical distribution, and {{OPP_SUBLICENSE_RIGHTS}} to sub-license to third-party platforms.",
    variables: [
      {
        field: "OPP_EXCLUSIVITY",
        canonical_key: "Exclusivity__c",
        placeholder: "{{OPP_EXCLUSIVITY}}",
        default: "non-exclusive",
      },
      {
        field: "OPP_SUBLICENSE_RIGHTS",
        canonical_key: "Sublicense_Rights__c",
        placeholder: "{{OPP_SUBLICENSE_RIGHTS}}",
        default: "the right",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "RISK-SCOPE-EXCLUSIVE-V1",
    clause_type: "SCOPE_OF_RIGHTS",
    version: 1,
    contract_types: ["distribution"],
    section: "scope",
    risk_level: "elevated",
    body: "1.1 Label hereby grants to Distributor the EXCLUSIVE right to distribute, market, sell, and exploit the Recordings in ALL formats throughout the Territory, including but not limited to digital, physical, streaming, broadcast, and any formats hereafter devised.\n\n1.2 During the Term, Label shall not engage any other distributor for the Territory without Distributor's prior written consent.",
    variables: [],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
      { field: "OPP_EXCLUSIVITY", condition: "equals", value: "Exclusive" },
    ],
    generation_config: { priority: 20, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-TERM-DIST-V1",
    clause_type: "TERM_DURATION",
    version: 1,
    contract_types: ["distribution"],
    section: "term",
    risk_level: "standard",
    body: '2.1 The initial term of this Agreement shall be {{OPP_TERM_LENGTH}} commencing on the Effective Date (the "Initial Term").\n\n2.2 The Territory covered by this Agreement shall be {{OPP_TERRITORY}}.\n\n2.3 This Agreement shall {{OPP_AUTO_RENEW}} at the end of the Initial Term.',
    variables: [
      {
        field: "OPP_TERM_LENGTH",
        canonical_key: "Term_Length__c",
        placeholder: "{{OPP_TERM_LENGTH}}",
        default: null,
      },
      {
        field: "OPP_TERRITORY",
        canonical_key: "Territory__c",
        placeholder: "{{OPP_TERRITORY}}",
        default: null,
      },
      {
        field: "OPP_AUTO_RENEW",
        canonical_key: "Auto_Renew__c",
        placeholder: "{{OPP_AUTO_RENEW}}",
        default: "not automatically renew",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-COMPENSATION-DIST-V1",
    clause_type: "ROYALTY_RATE",
    version: 1,
    contract_types: ["distribution"],
    section: "compensation",
    risk_level: "standard",
    body: "3.1 Distributor shall pay Label a royalty equal to {{OPP_ROYALTY_RATE}} of Net Receipts, payable on a {{OPP_PAYMENT_TERMS}} basis.\n\n3.2 Label shall pay to Distributor a distribution fee equal to {{OPP_DISTRIBUTION_FEE}} of Net Receipts.\n\n3.3 {{OPP_ADVANCE_CLAUSE}}",
    variables: [
      {
        field: "OPP_ROYALTY_RATE",
        canonical_key: "Royalty_Rate__c",
        placeholder: "{{OPP_ROYALTY_RATE}}",
        default: null,
      },
      {
        field: "OPP_PAYMENT_TERMS",
        canonical_key: "Payment_Terms__c",
        placeholder: "{{OPP_PAYMENT_TERMS}}",
        default: "quarterly",
      },
      {
        field: "OPP_DISTRIBUTION_FEE",
        canonical_key: "Distribution_Fee__c",
        placeholder: "{{OPP_DISTRIBUTION_FEE}}",
        default: null,
      },
      {
        field: "OPP_ADVANCE_CLAUSE",
        canonical_key: "Advance_Clause__c",
        placeholder: "{{OPP_ADVANCE_CLAUSE}}",
        default: "No advance shall be payable under this Agreement.",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "RISK-COMPENSATION-HIGH-ADVANCE-V1",
    clause_type: "ADVANCE_PAYMENT",
    version: 1,
    contract_types: ["distribution"],
    section: "compensation",
    risk_level: "critical",
    body: "3.3 Distributor shall pay Label a non-refundable, non-recoupable advance of {{OPP_ADVANCE_AMOUNT}} upon full execution of this Agreement. This advance shall not be offset against royalties or other amounts due hereunder.",
    variables: [
      {
        field: "OPP_ADVANCE_AMOUNT",
        canonical_key: "Advance_Amount__c",
        placeholder: "{{OPP_ADVANCE_AMOUNT}}",
        default: null,
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
      { field: "OPP_ADVANCE_AMOUNT", condition: "exists" },
    ],
    generation_config: { priority: 20, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-DELIVERY-DIST-V1",
    clause_type: "DELIVERY_REQUIREMENTS",
    version: 1,
    contract_types: ["distribution"],
    section: "delivery",
    risk_level: "standard",
    body: "4.1 Label shall deliver to Distributor master recordings in industry-standard formats (WAV 24-bit/96kHz minimum) together with all metadata, artwork, and credits.\n\n4.2 Distributor shall have {{OPP_ACCEPTANCE_PERIOD}} from receipt to accept or reject each delivery on reasonable technical grounds.",
    variables: [
      {
        field: "OPP_ACCEPTANCE_PERIOD",
        canonical_key: "Acceptance_Period__c",
        placeholder: "{{OPP_ACCEPTANCE_PERIOD}}",
        default: "fourteen (14) business days",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "BOILER-REPRESENTATIONS-V1",
    clause_type: "REPRESENTATIONS_WARRANTIES",
    version: 1,
    contract_types: ["distribution", "license", "recording", "publishing"],
    section: "representations",
    risk_level: "standard",
    body: "5.1 Each party represents and warrants that: (a) it has the full right, power, and authority to enter into this Agreement; (b) the execution of this Agreement does not violate any other agreement to which it is a party; and (c) it shall comply with all applicable laws and regulations.\n\n5.2 Label further represents that it owns or controls all rights in the Recordings necessary to grant the rights herein.",
    variables: [],
    triggers: [{ field: "OPP_CONTRACT_TYPE", condition: "default" }],
    generation_config: { priority: 1, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-TERMINATION-DIST-V1",
    clause_type: "TERMINATION_PROVISIONS",
    version: 1,
    contract_types: ["distribution"],
    section: "termination",
    risk_level: "elevated",
    body: "6.1 Either party may terminate this Agreement upon {{OPP_NOTICE_PERIOD}} written notice to the other party.\n\n6.2 Upon termination, Distributor shall have a sell-off period of {{OPP_SELLOFF_PERIOD}} to dispose of existing inventory.\n\n6.3 All accrued and unpaid royalties shall become due and payable within thirty (30) days of termination.",
    variables: [
      {
        field: "OPP_NOTICE_PERIOD",
        canonical_key: "Notice_Period__c",
        placeholder: "{{OPP_NOTICE_PERIOD}}",
        default: "ninety (90) days'",
      },
      {
        field: "OPP_SELLOFF_PERIOD",
        canonical_key: "Selloff_Period__c",
        placeholder: "{{OPP_SELLOFF_PERIOD}}",
        default: "six (6) months",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "BOILER-GENERAL-V1",
    clause_type: "GENERAL_PROVISIONS",
    version: 1,
    contract_types: ["distribution", "license", "recording", "publishing"],
    section: "general",
    risk_level: "standard",
    body: "7.1 Governing Law. This Agreement shall be governed by the laws of the State of {{OPP_GOVERNING_LAW}}.\n\n7.2 Entire Agreement. This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements.\n\n7.3 Amendments. No modification of this Agreement shall be effective unless in writing and signed by both parties.\n\n7.4 Notices. All notices shall be in writing and delivered to the addresses set forth above.",
    variables: [
      {
        field: "OPP_GOVERNING_LAW",
        canonical_key: "Governing_Law__c",
        placeholder: "{{OPP_GOVERNING_LAW}}",
        default: "New York",
      },
    ],
    triggers: [{ field: "OPP_CONTRACT_TYPE", condition: "default" }],
    generation_config: { priority: 1, fallback: "[TO_BE_DEFINED]" },
  },
];

/** Get clauses for a given section and contract type */
export function getClausesForSection(
  section: string,
  contractType: string,
): Clause[] {
  return MOCK_CLAUSES.filter(
    (c) =>
      c.section === section &&
      (c.contract_types.includes(contractType) ||
        c.triggers.some((t) => t.condition === "default")),
  );
}

/** Get all unique variables across a template's clauses */
export function getTemplateVariables(contractType: string): ClauseVariable[] {
  const clauses = MOCK_CLAUSES.filter(
    (c) =>
      c.contract_types.includes(contractType) ||
      c.triggers.some((t) => t.condition === "default"),
  );
  const seen = new Set<string>();
  const vars: ClauseVariable[] = [];
  for (const clause of clauses) {
    for (const v of clause.variables) {
      if (!seen.has(v.field)) {
        seen.add(v.field);
        vars.push(v);
      }
    }
  }
  return vars;
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/lib/mock-clauses.ts
git commit -m "feat(contracts): add clause library types, mock clauses, and Distribution template"
```

---

### Task 2: Generator Zustand Store

**Files:**

- Create: `apps/web/src/stores/generator.store.ts`

**Step 1: Create the generator store**

Manages: selected contract type, current wizard step, field values, selected clause overrides, and assembled preview text.

```typescript
import { create } from "zustand";
import {
  MOCK_TEMPLATES,
  MOCK_CLAUSES,
  getClausesForSection,
  type ContractTemplate,
  type Clause,
} from "@/lib/mock-clauses";

interface GeneratorState {
  /** Selected contract type ID */
  contractType: string | null;
  /** Active template */
  template: ContractTemplate | null;
  /** Current wizard step index (0-based) */
  currentStep: number;
  /** Field values: { CHECK_CODE: userValue } */
  fieldValues: Record<string, string>;
  /** Clause overrides: { sectionId: clauseId } */
  clauseOverrides: Record<string, string>;
  /** Assembled preview markdown */
  preview: string;

  /** Select a contract type and load its template */
  selectContractType: (typeId: string) => void;
  /** Move to next wizard step */
  nextStep: () => void;
  /** Move to previous wizard step */
  prevStep: () => void;
  /** Jump to a specific step */
  goToStep: (step: number) => void;
  /** Set a field value */
  setFieldValue: (field: string, value: string) => void;
  /** Override a clause for a section */
  overrideClause: (sectionId: string, clauseId: string) => void;
  /** Assemble the preview from current state */
  assemblePreview: () => void;
  /** Reset the generator */
  reset: () => void;
}

function interpolate(
  body: string,
  values: Record<string, string>,
  fallback: string,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, field) => {
    return values[field] || fallback;
  });
}

function assemble(
  template: ContractTemplate,
  fieldValues: Record<string, string>,
  clauseOverrides: Record<string, string>,
): string {
  const lines: string[] = [];
  lines.push(`# ${template.display_name}\n`);

  for (const section of template.sections) {
    lines.push(`## ${section.title}\n`);

    // Find the clause for this section
    const overrideId = clauseOverrides[section.id];
    const candidates = getClausesForSection(section.id, template.contract_type);
    const clause = overrideId
      ? (candidates.find((c) => c.clause_id === overrideId) ?? candidates[0])
      : candidates.sort(
          (a, b) => b.generation_config.priority - a.generation_config.priority,
        )[0];

    if (clause) {
      const text = interpolate(
        clause.body,
        fieldValues,
        clause.generation_config.fallback,
      );
      lines.push(text);
      lines.push(`\n*Clause: ${clause.clause_id}*\n`);
    } else {
      lines.push("*[No clause available for this section]*\n");
    }
  }

  return lines.join("\n");
}

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  contractType: null,
  template: null,
  currentStep: 0,
  fieldValues: {},
  clauseOverrides: {},
  preview: "",

  selectContractType: (typeId) => {
    const template = MOCK_TEMPLATES[typeId] ?? null;
    set({
      contractType: typeId,
      template,
      currentStep: 0,
      fieldValues: {},
      clauseOverrides: {},
      preview: "",
    });
    if (template) {
      // Auto-assemble initial preview
      const state = get();
      set({
        preview: assemble(template, state.fieldValues, state.clauseOverrides),
      });
    }
  },

  nextStep: () => {
    const { currentStep, template } = get();
    if (template && currentStep < template.sections.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  goToStep: (step) => set({ currentStep: step }),

  setFieldValue: (field, value) => {
    const newValues = { ...get().fieldValues, [field]: value };
    const { template, clauseOverrides } = get();
    set({ fieldValues: newValues });
    if (template) {
      set({ preview: assemble(template, newValues, clauseOverrides) });
    }
  },

  overrideClause: (sectionId, clauseId) => {
    const newOverrides = { ...get().clauseOverrides, [sectionId]: clauseId };
    const { template, fieldValues } = get();
    set({ clauseOverrides: newOverrides });
    if (template) {
      set({ preview: assemble(template, fieldValues, newOverrides) });
    }
  },

  assemblePreview: () => {
    const { template, fieldValues, clauseOverrides } = get();
    if (template) {
      set({ preview: assemble(template, fieldValues, clauseOverrides) });
    }
  },

  reset: () =>
    set({
      contractType: null,
      template: null,
      currentStep: 0,
      fieldValues: {},
      clauseOverrides: {},
      preview: "",
    }),
}));
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/stores/generator.store.ts
git commit -m "feat(contracts): add generator Zustand store with assembly engine"
```

---

### Task 3: ContractTypeSelector Molecule

**Files:**

- Create: `apps/web/src/components/molecules/ContractTypeSelector.tsx`

**Step 1: Create the contract type selector**

Shows 24 contract types grouped by vertical in collapsible sections. Clicking a type fires `onSelect`.

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  CONTRACT_TYPES,
  VERTICAL_LABELS,
  type ContractVertical,
} from "@/lib/mock-clauses";

interface ContractTypeSelectorProps {
  selectedType: string | null;
  onSelect: (typeId: string) => void;
}

const VERTICALS: ContractVertical[] = [
  "music_core",
  "music_ancillary",
  "film",
  "tv",
  "cross_entertainment",
];

export default function ContractTypeSelector({
  selectedType,
  onSelect,
}: ContractTypeSelectorProps) {
  const [expandedVerticals, setExpandedVerticals] = useState<
    Set<ContractVertical>
  >(new Set(["music_core"]));

  const toggleVertical = (v: ContractVertical) => {
    setExpandedVerticals((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Select Contract Type
      </h3>
      {VERTICALS.map((vertical) => {
        const types = CONTRACT_TYPES.filter((t) => t.vertical === vertical);
        const isExpanded = expandedVerticals.has(vertical);

        return (
          <div key={vertical}>
            <button
              onClick={() => toggleVertical(vertical)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-text-secondary hover:bg-surface-overlay"
            >
              {isExpanded ? (
                <ChevronDown size={12} className="text-text-muted" />
              ) : (
                <ChevronRight size={12} className="text-text-muted" />
              )}
              {VERTICAL_LABELS[vertical]}
              <span className="ml-auto text-[10px] text-text-muted">
                {types.length}
              </span>
            </button>

            {isExpanded && (
              <div className="ml-4 flex flex-col gap-0.5 py-1">
                {types.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => onSelect(type.id)}
                    className={`w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-sm transition-colors duration-fast ${
                      selectedType === type.id
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "text-text-primary hover:bg-surface-overlay"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/components/molecules/ContractTypeSelector.tsx
git commit -m "feat(contracts): add ContractTypeSelector with 24 types across 5 verticals"
```

---

### Task 4: ClausePicker Molecule

**Files:**

- Create: `apps/web/src/components/molecules/ClausePicker.tsx`

**Step 1: Create the clause picker**

Shows available clauses for the current section with risk level badges. Allows selecting an alternate clause.

```tsx
"use client";

import { type Clause, type RiskLevel } from "@/lib/mock-clauses";

const riskStyles: Record<RiskLevel, string> = {
  standard: "",
  elevated: "bg-gate-amber/20 text-gate-amber",
  critical: "bg-gate-red/20 text-gate-red",
  high: "bg-gate-red/20 text-gate-red animate-pulse",
};

interface ClausePickerProps {
  clauses: Clause[];
  selectedClauseId: string | null;
  onSelect: (clauseId: string) => void;
  className?: string;
}

export default function ClausePicker({
  clauses,
  selectedClauseId,
  onSelect,
  className,
}: ClausePickerProps) {
  if (clauses.length === 0) {
    return (
      <p className={`text-xs text-text-muted ${className ?? ""}`}>
        No clauses available for this section.
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        Available Clauses
      </h4>
      {clauses.map((clause) => {
        const isSelected = clause.clause_id === selectedClauseId;
        return (
          <button
            key={clause.clause_id}
            onClick={() => onSelect(clause.clause_id)}
            className={`w-full cursor-pointer rounded-md border px-3 py-2 text-left transition-colors duration-fast ${
              isSelected
                ? "border-accent-primary/30 bg-accent-primary/10"
                : "border-surface-border hover:bg-surface-overlay"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-text-muted">
                {clause.clause_id}
              </span>
              {clause.risk_level !== "standard" && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${riskStyles[clause.risk_level]}`}
                >
                  {clause.risk_level}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {clause.clause_type.replace(/_/g, " ")}
            </p>
            <p className="mt-0.5 text-[10px] text-text-muted">
              {clause.variables.length} variable
              {clause.variables.length !== 1 ? "s" : ""}
            </p>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/components/molecules/ClausePicker.tsx
git commit -m "feat(contracts): add ClausePicker molecule with risk level badges"
```

---

### Task 5: SectionWizard Organism

**Files:**

- Create: `apps/web/src/components/organisms/SectionWizard.tsx`

**Step 1: Create the section-by-section form wizard**

Step navigation bar + field inputs for the current section's clause variables + clause picker. Reads from generator store.

```tsx
"use client";

import { getClausesForSection } from "@/lib/mock-clauses";
import ClausePicker from "@/components/molecules/ClausePicker";
import { useGeneratorStore } from "@/stores/generator.store";

export default function SectionWizard() {
  const {
    template,
    currentStep,
    fieldValues,
    clauseOverrides,
    nextStep,
    prevStep,
    goToStep,
    setFieldValue,
    overrideClause,
  } = useGeneratorStore();

  if (!template) return null;

  const section = template.sections[currentStep];
  const clauses = getClausesForSection(section.id, template.contract_type);
  const selectedClauseId =
    clauseOverrides[section.id] ?? clauses[0]?.clause_id ?? null;
  const activeClause =
    clauses.find((c) => c.clause_id === selectedClauseId) ?? clauses[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Step navigation bar */}
      <div className="flex gap-1 overflow-x-auto">
        {template.sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goToStep(i)}
            className={`flex-shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-fast ${
              i === currentStep
                ? "bg-accent-primary/20 text-accent-primary"
                : i < currentStep
                  ? "bg-gate-green/10 text-gate-green"
                  : "text-text-muted hover:bg-surface-overlay hover:text-text-secondary"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          {section.title}
        </h3>
        <p className="text-xs text-text-muted">
          {section.type === "boilerplate"
            ? "Boilerplate section"
            : "Conditional section"}{" "}
          — Step {currentStep + 1} of {template.sections.length}
        </p>
      </div>

      {/* Field inputs for active clause variables */}
      {activeClause && activeClause.variables.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Fields
          </h4>
          {activeClause.variables.map((v) => (
            <div key={v.field}>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {v.field.replace(/^(OPP_|ACCT_)/, "").replace(/_/g, " ")}
              </label>
              <input
                type="text"
                value={fieldValues[v.field] ?? ""}
                onChange={(e) => setFieldValue(v.field, e.target.value)}
                placeholder={v.default ?? v.placeholder}
                className="w-full rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* Clause picker (conditional sections only) */}
      {section.type === "conditional" && clauses.length > 1 && (
        <ClausePicker
          clauses={clauses}
          selectedClauseId={selectedClauseId}
          onSelect={(id) => overrideClause(section.id, id)}
          className="mt-2"
        />
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={nextStep}
          disabled={currentStep === template.sections.length - 1}
          className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {currentStep === template.sections.length - 1 ? "Complete" : "Next"}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/SectionWizard.tsx
git commit -m "feat(contracts): add SectionWizard organism with step navigation and fields"
```

---

### Task 6: ContractPreview Organism

**Files:**

- Create: `apps/web/src/components/organisms/ContractPreview.tsx`

**Step 1: Create the live preview panel**

Renders the assembled contract as formatted text. Highlights unfilled `[TO_BE_DEFINED]` placeholders in amber. Shows clause IDs for each section.

```tsx
"use client";

import { useGeneratorStore } from "@/stores/generator.store";

export default function ContractPreview() {
  const { preview, template } = useGeneratorStore();

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">
          Select a contract type to begin.
        </p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">Building preview...</p>
      </div>
    );
  }

  // Parse the preview markdown into styled segments
  const lines = preview.split("\n");

  return (
    <div className="flex flex-col h-full">
      {/* Preview header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Preview
        </span>
        <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
          {template.display_name}
        </span>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          {lines.map((line, i) => {
            // H1
            if (line.startsWith("# ")) {
              return (
                <h1
                  key={i}
                  className="mb-6 text-center text-lg font-bold uppercase tracking-wide text-text-primary"
                >
                  {line.slice(2)}
                </h1>
              );
            }
            // H2
            if (line.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="mb-3 mt-6 border-b border-surface-border pb-1 text-sm font-bold uppercase tracking-wider text-text-primary"
                >
                  {line.slice(3)}
                </h2>
              );
            }
            // Clause ID reference (italic)
            if (line.startsWith("*Clause:")) {
              return (
                <p
                  key={i}
                  className="mb-4 font-mono text-[10px] text-text-muted"
                >
                  {line.replace(/\*/g, "")}
                </p>
              );
            }
            // Empty line
            if (line.trim() === "") {
              return <div key={i} className="h-2" />;
            }
            // Regular text — highlight [TO_BE_DEFINED] placeholders
            return (
              <p
                key={i}
                className="mb-2 text-sm leading-relaxed text-text-secondary"
              >
                {line.split(/(\[TO_BE_DEFINED\])/).map((segment, j) =>
                  segment === "[TO_BE_DEFINED]" ? (
                    <span
                      key={j}
                      className="rounded bg-gate-amber/20 px-1 py-0.5 font-mono text-xs text-gate-amber"
                    >
                      [TO_BE_DEFINED]
                    </span>
                  ) : (
                    <span key={j}>{segment}</span>
                  ),
                )}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/ContractPreview.tsx
git commit -m "feat(contracts): add ContractPreview organism with placeholder highlighting"
```

---

### Task 7: Generator Page + Two-Pane Layout

**Files:**

- Create: `apps/web/src/app/(shell)/(modules)/contracts/generator/page.tsx`

**Step 1: Create the generator page**

Two-pane layout: left half is Builder (type selector → wizard), right half is Preview. Uses the generator store.

```tsx
"use client";

import ContractTypeSelector from "@/components/molecules/ContractTypeSelector";
import SectionWizard from "@/components/organisms/SectionWizard";
import ContractPreview from "@/components/organisms/ContractPreview";
import { useGeneratorStore } from "@/stores/generator.store";

export default function GeneratorPage() {
  const { contractType, template, selectContractType, reset } =
    useGeneratorStore();

  return (
    <div className="flex h-full">
      {/* Builder pane (left) */}
      <div className="flex w-1/2 flex-col border-r border-surface-border">
        {/* Builder header */}
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Contract Builder
          </span>
          {template && (
            <button
              onClick={reset}
              className="cursor-pointer text-xs text-text-muted transition-colors hover:text-text-secondary"
            >
              Start Over
            </button>
          )}
        </div>

        {/* Builder content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!template ? (
            <ContractTypeSelector
              selectedType={contractType}
              onSelect={selectContractType}
            />
          ) : (
            <SectionWizard />
          )}
        </div>
      </div>

      {/* Preview pane (right) */}
      <div className="flex w-1/2 flex-col bg-surface-sunken">
        <ContractPreview />
      </div>
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add apps/web/src/app/\(shell\)/\(modules\)/contracts/generator/page.tsx
git commit -m "feat(contracts): add generator page with two-pane Builder + Preview layout"
```

---

### Task 8: Lint + Type-Check Full Verification

**Files:**

- None (verification only)

**Step 1: Run full type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: Exit code 0

**Step 2: Run full lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm lint`
Expected: Exit code 0

**Step 3: Fix any issues found, then commit if fixes were needed**

```bash
git add -A
git commit -m "fix(contracts): resolve lint/type errors from contract generator"
```
