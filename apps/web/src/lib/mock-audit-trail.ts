/**
 * Mock audit trail data — maps vault lifecycle events to WorkflowNode categories.
 * Uses VaultEvent type from event.store.ts and vault IDs from mock-vaults.ts.
 */

import type { VaultEvent } from "@/stores/event.store";
import type { NodeCategory, WorkflowNodeType } from "@/lib/mock-workflows";

/* ── Event → Node config ──────────────────────────────── */

export interface AuditEventConfig {
  category: NodeCategory;
  nodeType: WorkflowNodeType;
  label: string;
}

export const AUDIT_EVENT_CONFIG: Record<string, AuditEventConfig> = {
  vault_created: {
    category: "trigger",
    nodeType: "trigger",
    label: "Vault Created",
  },
  extraction_complete: {
    category: "function",
    nodeType: "ai_classify",
    label: "Extraction Complete",
  },
  gate_cleared: {
    category: "function",
    nodeType: "batch",
    label: "Gate Cleared",
  },
  chamber_advanced: {
    category: "action",
    nodeType: "start_workflow",
    label: "Chamber Advanced",
  },
  vault_updated: {
    category: "action",
    nodeType: "update_record",
    label: "Vault Updated",
  },
  vault_archived: {
    category: "action",
    nodeType: "log_event",
    label: "Vault Archived",
  },
  member_added: {
    category: "action",
    nodeType: "assign",
    label: "Member Added",
  },
  member_removed: {
    category: "action",
    nodeType: "assign",
    label: "Member Removed",
  },
};

/* ── Helpers ──────────────────────────────────────────── */

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

/* ── Per-vault mock audit trails ──────────────────────── */

/** vault_001 (discover) — 3 events */
const VAULT_001_TRAIL: VaultEvent[] = [
  {
    id: "aud_001_1",
    vault_id: "vault_001",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "dev_user_001",
    payload: {
      name: "Henderson MSA",
      vault_type: "contract",
      chamber: "discover",
    },
    created_at: daysAgo(3),
  },
  {
    id: "aud_001_2",
    vault_id: "vault_001",
    workspace_id: "ws_dev",
    event_type: "member_added",
    actor_id: "dev_user_001",
    payload: { member_name: "Jane Builder", role: "builder" },
    created_at: daysAgo(3),
  },
  {
    id: "aud_001_3",
    vault_id: "vault_001",
    workspace_id: "ws_dev",
    event_type: "extraction_complete",
    actor_id: null,
    payload: { fields_extracted: 8, confidence: 0.76 },
    created_at: daysAgo(2),
  },
];

/** vault_004 (build) — 6 events */
const VAULT_004_TRAIL: VaultEvent[] = [
  {
    id: "aud_004_1",
    vault_id: "vault_004",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "dev_user_001",
    payload: {
      name: "Sony-BigBooty Dist Agreement",
      vault_type: "contract",
      chamber: "discover",
    },
    created_at: daysAgo(7),
  },
  {
    id: "aud_004_2",
    vault_id: "vault_004",
    workspace_id: "ws_dev",
    event_type: "member_added",
    actor_id: "dev_user_001",
    payload: { member_name: "Ana Martinez", role: "builder" },
    created_at: daysAgo(7),
  },
  {
    id: "aud_004_3",
    vault_id: "vault_004",
    workspace_id: "ws_dev",
    event_type: "extraction_complete",
    actor_id: null,
    payload: { fields_extracted: 14, confidence: 0.92 },
    created_at: daysAgo(5),
  },
  {
    id: "aud_004_4",
    vault_id: "vault_004",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: null,
    payload: { gate: "gate_triage" },
    created_at: daysAgo(4),
  },
  {
    id: "aud_004_5",
    vault_id: "vault_004",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: { from: "discover", to: "build" },
    created_at: daysAgo(4),
  },
  {
    id: "aud_004_6",
    vault_id: "vault_004",
    workspace_id: "ws_dev",
    event_type: "vault_updated",
    actor_id: "dev_user_001",
    payload: { fields_modified: ["territory", "effective_date"] },
    created_at: daysAgo(2),
  },
];

/** vault_006 (review) — 8 events */
const VAULT_006_TRAIL: VaultEvent[] = [
  {
    id: "aud_006_1",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "dev_user_001",
    payload: {
      name: "Universal Amendment #3",
      vault_type: "contract",
      chamber: "discover",
    },
    created_at: daysAgo(14),
  },
  {
    id: "aud_006_2",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "member_added",
    actor_id: "dev_user_001",
    payload: { member_name: "Billy Chen", role: "builder" },
    created_at: daysAgo(14),
  },
  {
    id: "aud_006_3",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "extraction_complete",
    actor_id: null,
    payload: { fields_extracted: 11, confidence: 0.88 },
    created_at: daysAgo(12),
  },
  {
    id: "aud_006_4",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: null,
    payload: { gate: "gate_triage" },
    created_at: daysAgo(10),
  },
  {
    id: "aud_006_5",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: { from: "discover", to: "build" },
    created_at: daysAgo(10),
  },
  {
    id: "aud_006_6",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "vault_updated",
    actor_id: "dev_user_001",
    payload: { fields_modified: ["royalty_rate", "term_length", "territory"] },
    created_at: daysAgo(7),
  },
  {
    id: "aud_006_7",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: null,
    payload: { gate: "gate_preflight" },
    created_at: daysAgo(5),
  },
  {
    id: "aud_006_8",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: { from: "build", to: "review" },
    created_at: daysAgo(5),
  },
];

/** vault_007 (ship) — 10 events, full lifecycle */
const VAULT_007_TRAIL: VaultEvent[] = [
  {
    id: "aud_007_01",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "dev_user_001",
    payload: {
      name: "BMG Catalog Transfer",
      vault_type: "contract",
      chamber: "discover",
    },
    created_at: daysAgo(21),
  },
  {
    id: "aud_007_02",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "member_added",
    actor_id: "dev_user_001",
    payload: { member_name: "Dave Park", role: "builder" },
    created_at: daysAgo(21),
  },
  {
    id: "aud_007_03",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "extraction_complete",
    actor_id: null,
    payload: { fields_extracted: 18, confidence: 0.95 },
    created_at: daysAgo(19),
  },
  {
    id: "aud_007_04",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: null,
    payload: { gate: "gate_triage" },
    created_at: daysAgo(17),
  },
  {
    id: "aud_007_05",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: { from: "discover", to: "build" },
    created_at: daysAgo(17),
  },
  {
    id: "aud_007_06",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "vault_updated",
    actor_id: "dev_user_001",
    payload: { fields_modified: ["catalog_ids", "transfer_date", "territory"] },
    created_at: daysAgo(14),
  },
  {
    id: "aud_007_07",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: null,
    payload: { gate: "gate_preflight" },
    created_at: daysAgo(10),
  },
  {
    id: "aud_007_08",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: { from: "build", to: "review" },
    created_at: daysAgo(10),
  },
  {
    id: "aud_007_09",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: null,
    payload: { gate: "gate_gatekeeper" },
    created_at: daysAgo(3),
  },
  {
    id: "aud_007_10",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: { from: "review", to: "ship" },
    created_at: hoursAgo(12),
  },
];

/* ── Aggregated map ───────────────────────────────────── */

export const MOCK_AUDIT_TRAILS: Record<string, VaultEvent[]> = {
  vault_001: VAULT_001_TRAIL,
  vault_004: VAULT_004_TRAIL,
  vault_006: VAULT_006_TRAIL,
  vault_007: VAULT_007_TRAIL,
};

/** Get audit trail for a vault, falling back to empty array */
export function getMockAuditTrail(vaultId: string): VaultEvent[] {
  return MOCK_AUDIT_TRAILS[vaultId] ?? [];
}
