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
    name: "Henderson MSA",
    slug: "henderson-msa",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "discover",
    gate: "gate_triage",
    metadata: { entity: "Henderson Corp", contract_type: "Master Services" },
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
    name: "Warner Distribution Q2",
    slug: "warner-dist-q2",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "discover",
    gate: "gate_ingest",
    metadata: { entity: "Warner Music", contract_type: "Distribution" },
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
    name: "Summit Publishing License",
    slug: "summit-publishing-license",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "discover",
    gate: "gate_triage",
    metadata: { entity: "Summit Publishing", contract_type: "License" },
    health_score: 58,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_004",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Sony-BigBooty Dist Agreement",
    slug: "sony-bigbooty-dist",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "build",
    gate: "gate_extract",
    metadata: { entity: "Sony Music", contract_type: "Distribution" },
    health_score: 72,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_005",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Atlantic Sync License",
    slug: "atlantic-sync-license",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "build",
    gate: "gate_preflight",
    metadata: { entity: "Atlantic Records", contract_type: "Sync License" },
    health_score: 85,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_006",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Universal Amendment #3",
    slug: "universal-amendment-3",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "review",
    gate: "gate_gatekeeper",
    metadata: { entity: "Universal Music", contract_type: "Amendment" },
    health_score: 91,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_007",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "BMG Catalog Transfer",
    slug: "bmg-catalog-transfer",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "ship",
    gate: "gate_export",
    metadata: { entity: "BMG Rights", contract_type: "Transfer" },
    health_score: 98,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
];
