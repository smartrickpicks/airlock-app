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
    vault_id: "vault_005",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "user_002",
    payload: {
      chamber: "review",
      gate: "gate_gatekeeper",
      vault_name: "Barclay Crenshaw — AWAL Digital Release",
      note: "Terms verified. Royalty split confirmed at 85/15. Awaiting Mia's final sign-off.",
    },
    created_at: minutesAgo(2),
  },
  {
    id: "evt_002",
    vault_id: "vault_003",
    workspace_id: "ws_dev",
    event_type: "extraction_complete",
    actor_id: null,
    payload: {
      fields_extracted: 18,
      confidence: 0.94,
      vault_name: "Jay Solis — Nettwerk Sync License",
      note: "Extracted: placement type, territory, term, fee, exclusivity window, usage rights.",
    },
    created_at: minutesAgo(8),
  },
  {
    id: "evt_003",
    vault_id: "vault_001",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "user_001",
    payload: {
      name: "Barclay Crenshaw — Direct Distribution Deal",
      vault_type: "contract",
      chamber: "discover",
      note: "Luna flagged this — Barclay wants to own his masters post-Dirtybird.",
    },
    created_at: minutesAgo(15),
  },
  {
    id: "evt_004",
    vault_id: "vault_004",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: null,
    payload: {
      gate: "gate_preflight",
      vault_name: "The Portals — Redbull Sound Stage",
      note: "All required fields present. Brand guidelines attachment verified.",
    },
    created_at: minutesAgo(23),
  },
  {
    id: "evt_005",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "user_003",
    payload: {
      chamber: "ship",
      gate: "gate_export",
      vault_name: "Nova Lux — Empire Worldwide Distribution",
      note: "Mia approved. Distribution goes live. Glass Frequencies drops April 11.",
    },
    created_at: minutesAgo(45),
  },
  {
    id: "evt_006",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: "user_002",
    payload: {
      gate: "gate_export",
      vault_name: "Jay Solis — Producer Agreement (Dex Rollins)",
      note: "Kai approved producer points. 3% on all Midnight Concrete tracks. Clean.",
    },
    created_at: minutesAgo(60),
  },
  {
    id: "evt_007",
    vault_id: "vault_002",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "user_001",
    payload: {
      name: "Nova Lux — Boiler Room Set Recording",
      vault_type: "contract",
      chamber: "discover",
      note: "Boiler Room reached out for a live recording session. Luna is triaging the performance license.",
    },
    created_at: minutesAgo(90),
  },
];
