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
