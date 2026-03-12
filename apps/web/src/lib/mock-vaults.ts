/**
 * Mock vault data for dev preview when API is not running.
 * Remove this file once the API + Postgres are available.
 */

export interface MockVault {
  id: string;
  workspace_id: string;
  parent_vault_id: string | null;
  vault_level: 1 | 2 | 3 | 4;
  name: string;
  slug: string;
  vault_type: string;
  module_type: string | null;
  chamber: "discover" | "build" | "review" | "ship" | null;
  gate: string | null;
  metadata: Record<string, unknown>;
  health_score: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const now = new Date().toISOString();

export const MOCK_VAULTS: MockVault[] = [
  {
    id: "vault_001",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Barclay Crenshaw — Direct Distribution Deal",
    slug: "barclay-direct-distro",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "discover",
    gate: "gate_triage",
    metadata: {
      entity: "Empire Distribution",
      contract_type: "Distribution",
      artist: "Barclay Crenshaw",
      territory: "Worldwide",
      term: "2 years",
    },
    health_score: 45,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_002",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Nova Lux — Boiler Room Set Recording",
    slug: "nova-lux-boiler-room",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "discover",
    gate: "gate_ingest",
    metadata: {
      entity: "Boiler Room",
      contract_type: "Performance License",
      artist: "Nova Lux",
      event_date: "2026-04-18",
    },
    health_score: 32,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_003",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Jay Solis — Nettwerk Sync License",
    slug: "jay-solis-nettwerk-sync",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "build",
    gate: "gate_extract",
    metadata: {
      entity: "Nettwerk Music Group",
      contract_type: "Sync License",
      artist: "Jay Solis",
      placement: "Netflix Original Series",
      fee: "$18,000",
    },
    health_score: 72,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_004",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "The Portals — Redbull Sound Stage",
    slug: "portals-redbull-stage",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "build",
    gate: "gate_preflight",
    metadata: {
      entity: "Redbull Records",
      contract_type: "Brand Partnership",
      artist: "The Portals",
      activation: "Redbull Sound Stage — Summer Festival",
      budget: "$35,000",
    },
    health_score: 85,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_005",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Barclay Crenshaw — AWAL Digital Release",
    slug: "barclay-awal-release",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "review",
    gate: "gate_gatekeeper",
    metadata: {
      entity: "AWAL",
      contract_type: "Digital Distribution",
      artist: "Barclay Crenshaw",
      release_title: "Urban Fauna EP",
      release_date: "2026-04-25",
      tracks: 6,
    },
    health_score: 91,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_006",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Nova Lux — Empire Worldwide Distribution",
    slug: "nova-lux-empire-distro",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "ship",
    gate: "gate_export",
    metadata: {
      entity: "Empire Distribution",
      contract_type: "Distribution",
      artist: "Nova Lux",
      album: "Glass Frequencies",
      territory: "Worldwide",
      term: "3 years",
      advance: "$50,000",
    },
    health_score: 98,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_007",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Jay Solis — Producer Agreement (Dex Rollins)",
    slug: "jay-solis-producer-agreement",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "ship",
    gate: "gate_export",
    metadata: {
      entity: "Jay Solis",
      contract_type: "Producer Agreement",
      producer: "Dex Rollins",
      points: "3%",
      tracks: "All of 'Midnight Concrete' LP",
    },
    health_score: 95,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
];
