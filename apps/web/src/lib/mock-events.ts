/**
 * Mock event data for dev preview when API is not running.
 */

export interface MockEvent {
  id: string;
  vault_id: string;
  workspace_id: string;
  event_type: string;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: "evt_001",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: {
      chamber: "review",
      gate: "gate_gatekeeper",
      vault_name: "Universal Amendment #3",
    },
    created_at: minutesAgo(2),
  },
  {
    id: "evt_002",
    vault_id: "vault_004",
    workspace_id: "ws_dev",
    event_type: "extraction_complete",
    actor_id: null,
    payload: {
      fields_extracted: 14,
      confidence: 0.92,
      vault_name: "Sony-BigBooty Dist Agreement",
    },
    created_at: minutesAgo(8),
  },
  {
    id: "evt_003",
    vault_id: "vault_001",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "dev_user_001",
    payload: {
      name: "Henderson MSA",
      vault_type: "contract",
      chamber: "discover",
    },
    created_at: minutesAgo(15),
  },
  {
    id: "evt_004",
    vault_id: "vault_005",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: null,
    payload: {
      gate: "gate_preflight",
      vault_name: "Atlantic Sync License",
    },
    created_at: minutesAgo(23),
  },
  {
    id: "evt_005",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: {
      chamber: "ship",
      gate: "gate_export",
      vault_name: "BMG Catalog Transfer",
    },
    created_at: minutesAgo(45),
  },
  {
    id: "evt_006",
    vault_id: "vault_002",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "dev_user_001",
    payload: {
      name: "Warner Distribution Q2",
      vault_type: "contract",
      chamber: "discover",
    },
    created_at: minutesAgo(120),
  },
];
