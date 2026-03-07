// ─── Types ───────────────────────────────────────────────────────────

export type ProviderType =
  | "anthropic"
  | "openai"
  | "openrouter"
  | "azure"
  | "custom";
export type ProviderStatus = "active" | "error" | "disabled";

export interface AiProvider {
  id: string;
  type: ProviderType;
  name: string;
  model: string;
  status: ProviderStatus;
  isDefault: boolean;
  roleAccess: string;
  lastRequestAt: string;
  costToday: number;
}

export type McpServerStatus = "active" | "error" | "disconnected";

export interface McpTool {
  name: string;
  description: string;
  roles: Record<string, boolean>; // role -> allowed
  modules: string[];
}

export interface McpServer {
  id: string;
  name: string;
  host: string;
  status: McpServerStatus;
  toolCount: number;
  tools: McpTool[];
  roleAccess: string;
  authType: string;
  creditsUsed?: number;
  creditsTotal?: number;
  lastSyncedAt: string;
  statusMessage?: string;
}

export type IntegrationStatus = "connected" | "error" | "available";

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  account?: string;
  features?: string[];
  statusMessage?: string;
}

export interface WorkspaceSkill {
  id: string;
  name: string;
  description: string;
  roles: string[];
  modules: string[];
  toolChain: { tool: string; server: string }[];
  isActive: boolean;
  createdBy: string;
}

// ─── Config ──────────────────────────────────────────────────────────

export const PROVIDER_STATUS_CONFIG: Record<
  ProviderStatus,
  { label: string; color: string; dotColor: string }
> = {
  active: {
    label: "Active",
    color: "bg-accent-success/15 text-accent-success",
    dotColor: "bg-accent-success",
  },
  error: {
    label: "Error",
    color: "bg-accent-danger/15 text-accent-danger",
    dotColor: "bg-accent-danger",
  },
  disabled: {
    label: "Disabled",
    color: "bg-text-muted/15 text-text-muted",
    dotColor: "bg-text-muted",
  },
};

export const MCP_STATUS_CONFIG: Record<
  McpServerStatus,
  { label: string; color: string; dotColor: string }
> = {
  active: {
    label: "Active",
    color: "bg-accent-success/15 text-accent-success",
    dotColor: "bg-accent-success",
  },
  error: {
    label: "Error",
    color: "bg-accent-danger/15 text-accent-danger",
    dotColor: "bg-accent-danger",
  },
  disconnected: {
    label: "Disconnected",
    color: "bg-text-muted/15 text-text-muted",
    dotColor: "bg-text-muted",
  },
};

export const INTEGRATION_STATUS_CONFIG: Record<
  IntegrationStatus,
  { label: string; color: string; dotColor: string }
> = {
  connected: {
    label: "Connected",
    color: "bg-accent-success/15 text-accent-success",
    dotColor: "bg-accent-success",
  },
  error: {
    label: "Error",
    color: "bg-accent-danger/15 text-accent-danger",
    dotColor: "bg-accent-danger",
  },
  available: {
    label: "Available",
    color: "bg-text-muted/15 text-text-muted",
    dotColor: "bg-text-muted",
  },
};

// ─── Mock Data ───────────────────────────────────────────────────────

export const MOCK_AI_PROVIDERS: AiProvider[] = [
  {
    id: "prov_001",
    type: "anthropic",
    name: "Anthropic (Claude)",
    model: "claude-sonnet-4-20250514",
    status: "active",
    isDefault: true,
    roleAccess: "All roles",
    lastRequestAt: "2026-03-07T14:58:00Z",
    costToday: 0.14,
  },
  {
    id: "prov_002",
    type: "openrouter",
    name: "OpenRouter",
    model: "anthropic/claude-opus-4",
    status: "active",
    isDefault: false,
    roleAccess: "Owner+ only",
    lastRequestAt: "2026-03-07T13:00:00Z",
    costToday: 0.02,
  },
  {
    id: "prov_003",
    type: "custom",
    name: "Custom Endpoint",
    model: "—",
    status: "disabled",
    isDefault: false,
    roleAccess: "Not configured",
    lastRequestAt: "",
    costToday: 0,
  },
];

export const MOCK_MCP_SERVERS: McpServer[] = [
  {
    id: "mcp_001",
    name: "Vibe Prospecting",
    host: "explorium.ai",
    status: "active",
    toolCount: 7,
    tools: [
      {
        name: "match-business",
        description: "Match a business entity",
        roles: { builder: true, gatekeeper: true, owner: true },
        modules: ["crm", "contracts"],
      },
      {
        name: "fetch-businesses",
        description: "Fetch business data",
        roles: { builder: true, gatekeeper: true, owner: true },
        modules: ["crm", "contracts"],
      },
      {
        name: "business-enrichment",
        description: "Enrich business profile",
        roles: { builder: false, gatekeeper: true, owner: true },
        modules: ["crm"],
      },
      {
        name: "fetch-prospects",
        description: "Fetch prospect data",
        roles: { builder: true, gatekeeper: true, owner: true },
        modules: ["crm", "contracts"],
      },
      {
        name: "prospect-enrichment",
        description: "Enrich prospect profile",
        roles: { builder: true, gatekeeper: true, owner: true },
        modules: ["crm"],
      },
      {
        name: "business-events",
        description: "Get recent business events",
        roles: { builder: false, gatekeeper: false, owner: true },
        modules: ["crm"],
      },
      {
        name: "export-to-csv",
        description: "Export results to CSV",
        roles: { builder: false, gatekeeper: false, owner: true },
        modules: ["crm", "contracts", "tasks", "calendar", "documents"],
      },
    ],
    roleAccess: "Builder+ in CRM/Contracts",
    authType: "API Key",
    creditsUsed: 847,
    creditsTotal: 1000,
    lastSyncedAt: "2026-03-07T14:30:00Z",
  },
  {
    id: "mcp_002",
    name: "Google Workspace",
    host: "google.com",
    status: "active",
    toolCount: 12,
    tools: [],
    roleAccess: "All roles",
    authType: "Service Account",
    lastSyncedAt: "2026-03-07T12:00:00Z",
  },
  {
    id: "mcp_003",
    name: "Salesforce MCP",
    host: "salesforce.com",
    status: "error",
    toolCount: 5,
    tools: [],
    roleAccess: "Owner+ only",
    authType: "OAuth 2.0",
    lastSyncedAt: "2026-03-04T10:00:00Z",
    statusMessage: "Auth token expired",
  },
];

export const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: "int_001",
    name: "Slack",
    description: "Send notifications and updates to Slack channels",
    status: "connected",
    account: "#airlock-notifications",
    features: ["Vault updates", "Gate transitions", "Mentions"],
  },
  {
    id: "int_002",
    name: "DocuSign",
    description: "E-signature workflows for contract execution",
    status: "connected",
    account: "admin@acmerecords.com",
    features: ["Signature requests", "Status tracking"],
  },
  {
    id: "int_003",
    name: "Notion",
    description: "Sync vaults and tasks with Notion databases",
    status: "available",
  },
  {
    id: "int_004",
    name: "Jira",
    description: "Two-way sync between Airlock tasks and Jira issues",
    status: "available",
  },
];

export const MOCK_SKILLS: WorkspaceSkill[] = [
  {
    id: "skill_001",
    name: "Headcount Trend Check",
    description:
      "Pulls LinkedIn workforce trend from Vibe Prospecting and checks growth",
    roles: ["builder", "gatekeeper"],
    modules: ["crm", "contracts"],
    toolChain: [
      { tool: "match-business", server: "Vibe Prospecting" },
      { tool: "business-enrichment", server: "Vibe Prospecting" },
    ],
    isActive: true,
    createdBy: "Zach",
  },
  {
    id: "skill_002",
    name: "Qualify Lead via Vibe",
    description: "Enriches a CRM vault with prospect data and scores fit",
    roles: ["builder"],
    modules: ["crm"],
    toolChain: [
      { tool: "match-business", server: "Vibe Prospecting" },
      { tool: "fetch-prospects", server: "Vibe Prospecting" },
      { tool: "prospect-enrichment", server: "Vibe Prospecting" },
    ],
    isActive: true,
    createdBy: "Zach",
  },
  {
    id: "skill_003",
    name: "Contract Risk Summary",
    description: "Analyzes contract terms and flags high-risk clauses using AI",
    roles: ["gatekeeper", "owner"],
    modules: ["contracts"],
    toolChain: [],
    isActive: false,
    createdBy: "Jane",
  },
];
