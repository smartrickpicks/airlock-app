// ─── Workspace ───────────────────────────────────────────────────────

export interface WorkspaceSettings {
  id: string;
  name: string;
  slug: string;
  industry: string;
  plan: "starter" | "pro" | "enterprise";
  createdAt: string;
  inviteUrl: string;
  logoUrl?: string;
  memberCount: number;
  vaultCount: number;
}

export const INDUSTRY_OPTIONS = [
  "Music & Entertainment",
  "Publishing & Media",
  "Technology",
  "Financial Services",
  "Healthcare",
  "Legal",
  "Real Estate",
  "Other",
];

export const MOCK_WORKSPACE: WorkspaceSettings = {
  id: "ws_airlock_01",
  name: "My Airlock",
  slug: "my-airlock",
  industry: "Music & Entertainment",
  plan: "starter",
  createdAt: "2026-03-08T00:00:00Z",
  inviteUrl: "https://app.airlock.dev/invite/my-airlock/tk_invite",
  memberCount: 1,
  vaultCount: 0,
};

// ─── Module Config ────────────────────────────────────────────────────

export interface ModuleConfig {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  vaultCount: number;
  activeMembers: number;
  chambers: string[];
  color: string;
}

export const MOCK_MODULE_CONFIGS: ModuleConfig[] = [
  {
    id: "contracts",
    label: "Contracts",
    description:
      "Contract lifecycle management — Discover, Build, Review, Ship.",
    enabled: true,
    vaultCount: 0,
    activeMembers: 1,
    chambers: ["Discover", "Build", "Review", "Ship"],
    color: "text-accent-primary",
  },
  {
    id: "crm",
    label: "CRM",
    description:
      "Account, lead, and deal pipeline management. The vault hierarchy is your CRM.",
    enabled: true,
    vaultCount: 0,
    activeMembers: 1,
    chambers: ["Discover", "Build", "Review", "Ship"],
    color: "text-accent-success",
  },
  {
    id: "tasks",
    label: "Tasks",
    description: "Universal task queue — inbox, board, and personal view.",
    enabled: true,
    vaultCount: 0,
    activeMembers: 1,
    chambers: [],
    color: "text-accent-warning",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Computed dates from vault fields and task due dates.",
    enabled: true,
    vaultCount: 0,
    activeMembers: 1,
    chambers: [],
    color: "text-accent-warning",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Document library with TipTap editor and PDF preview.",
    enabled: true,
    vaultCount: 0,
    activeMembers: 1,
    chambers: [],
    color: "text-text-secondary",
  },
];

// ─── Role System ──────────────────────────────────────────────────────
//
// Layer 1 — Org Role: workspace-level identity, controls admin access ceiling.
// Layer 2 — Module Role: per-module role, controls chamber visibility + actions.
//
// Org Role hierarchy (highest → lowest):
//   Architect > Executive > Director > Lead > Member
//
// Module Role hierarchy (highest → lowest):
//   Owner > Gatekeeper > Builder > Designer > Viewer

export type OrgRole =
  | "architect"
  | "executive"
  | "director"
  | "lead"
  | "member";
export type ModuleRole =
  | "owner"
  | "gatekeeper"
  | "builder"
  | "designer"
  | "viewer";

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  architect: "Architect",
  executive: "Executive",
  director: "Director",
  lead: "Lead",
  member: "Member",
};

export const MODULE_ROLE_LABELS: Record<ModuleRole, string> = {
  owner: "Owner",
  gatekeeper: "Gatekeeper",
  builder: "Builder",
  designer: "Designer",
  viewer: "Viewer",
};

// Chamber access per module role. Controls which chambers are visible/active.
export const CHAMBER_ACCESS: Record<ModuleRole, Record<string, boolean>> = {
  owner: { discover: true, build: true, review: true, ship: true },
  gatekeeper: { discover: true, build: true, review: true, ship: false },
  builder: { discover: true, build: true, review: false, ship: false },
  designer: { discover: true, build: true, review: false, ship: false },
  viewer: { discover: false, build: false, review: false, ship: false },
};

export interface RolePermission {
  action: string;
  description: string;
  architect: boolean;
  executive: boolean;
  director: boolean;
  lead: boolean;
  member: boolean;
}

export const ROLE_PERMISSIONS: RolePermission[] = [
  {
    action: "View vaults",
    description: "Read vault fields and events",
    architect: true,
    executive: true,
    director: true,
    lead: true,
    member: true,
  },
  {
    action: "Create vaults",
    description: "Open new vaults in any module",
    architect: true,
    executive: true,
    director: true,
    lead: true,
    member: false,
  },
  {
    action: "Submit patches",
    description: "Propose field value changes",
    architect: true,
    executive: true,
    director: true,
    lead: true,
    member: true,
  },
  {
    action: "Approve patches",
    description: "Accept or reject patch proposals",
    architect: true,
    executive: true,
    director: true,
    lead: false,
    member: false,
  },
  {
    action: "Promote gates",
    description: "Advance vaults between chambers",
    architect: true,
    executive: true,
    director: true,
    lead: false,
    member: false,
  },
  {
    action: "Manage members",
    description: "Invite, deactivate, change roles",
    architect: true,
    executive: false,
    director: false,
    lead: false,
    member: false,
  },
  {
    action: "Toggle feature flags",
    description: "Enable/disable platform features",
    architect: true,
    executive: false,
    director: false,
    lead: false,
    member: false,
  },
  {
    action: "View audit log",
    description: "See all admin actions",
    architect: true,
    executive: true,
    director: true,
    lead: false,
    member: false,
  },
  {
    action: "Configure integrations",
    description: "Connect third-party services",
    architect: true,
    executive: false,
    director: false,
    lead: false,
    member: false,
  },
  {
    action: "Export vaults",
    description: "Download vault data as PDF/JSON",
    architect: true,
    executive: true,
    director: true,
    lead: true,
    member: false,
  },
  {
    action: "Self-promote role",
    description: "Change your own org role (founder only)",
    architect: true,
    executive: false,
    director: false,
    lead: false,
    member: false,
  },
];

// ─── AI Provider ─────────────────────────────────────────────────────

export interface AIProviderConfig {
  id: string;
  label: string;
  model: string;
  status: "active" | "fallback" | "offline";
  latency: string;
  costPer1k: string;
  masked_key: string;
}

export const MOCK_AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: "claude",
    label: "Anthropic Claude",
    model: "claude-sonnet-4-6",
    status: "active",
    latency: "1.2s avg",
    costPer1k: "$0.003",
    masked_key: "sk-ant-••••••••••••••••••••••••••••4xKp",
  },
  {
    id: "openai",
    label: "OpenAI GPT-4",
    model: "gpt-4o",
    status: "fallback",
    latency: "1.8s avg",
    costPer1k: "$0.005",
    masked_key: "sk-••••••••••••••••••••••••••••••••ZqWf",
  },
  {
    id: "ollama",
    label: "Ollama (Local)",
    model: "llama3.2",
    status: "offline",
    latency: "—",
    costPer1k: "$0.000",
    masked_key: "localhost:11434",
  },
];

// ─── Data Sources ─────────────────────────────────────────────────────

export interface DataSource {
  id: string;
  label: string;
  type: string;
  status: "connected" | "pending" | "error" | "not_configured";
  lastSync?: string;
  description: string;
}

export const MOCK_DATA_SOURCES: DataSource[] = [
  {
    id: "postgres",
    label: "PostgreSQL (Internal)",
    type: "database",
    status: "connected",
    lastSync: "2026-03-08T00:00:00Z",
    description: "Primary application database — PostgreSQL 16 on Railway.",
  },
  {
    id: "redis",
    label: "Redis",
    type: "cache",
    status: "connected",
    lastSync: "2026-03-08T00:00:00Z",
    description: "Job queue and pub/sub broker — Redis 7.",
  },
  {
    id: "salesforce",
    label: "Salesforce",
    type: "crm",
    status: "not_configured",
    description: "Sync contacts and opportunities from Salesforce CRM.",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    type: "crm",
    status: "not_configured",
    description: "Import deals and contacts from HubSpot.",
  },
  {
    id: "google_drive",
    label: "Google Drive",
    type: "storage",
    status: "not_configured",
    description: "Attach and sync documents from Google Drive.",
  },
];

// ─── Integrations ─────────────────────────────────────────────────────

export interface Integration {
  id: string;
  label: string;
  description: string;
  status: "connected" | "not_connected";
  category: "communication" | "video" | "automation" | "notifications";
  docsUrl?: string;
}

export const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: "slack",
    label: "Slack",
    description: "Send vault notifications and approvals to Slack channels.",
    status: "not_connected",
    category: "communication",
  },
  {
    id: "novu",
    label: "Novu",
    description:
      "Multi-channel notification delivery (email, SMS, push, in-app).",
    status: "not_connected",
    category: "notifications",
  },
  {
    id: "jitsi",
    label: "Jitsi Meet",
    description:
      "Embedded video calls with post-call AI transcription pipeline.",
    status: "connected",
    category: "video",
  },
  {
    id: "zapier",
    label: "Zapier",
    description: "Connect Airlock to 5,000+ apps via Zapier webhooks.",
    status: "not_connected",
    category: "automation",
  },
  {
    id: "make",
    label: "Make (Integromat)",
    description: "Advanced automation scenarios with Airlock vault events.",
    status: "not_connected",
    category: "automation",
  },
];

// ─── Types ───────────────────────────────────────────────────────────

export type ThemeMode = "dark" | "light" | "system";
export type FontSize = "sm" | "md" | "lg";

export interface UserPreferences {
  theme: ThemeMode;
  sidebarWidth: number;
  fontSize: FontSize;
  reducedMotion: boolean;
  highContrast: boolean;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  headline?: string;
  /** Layer 1: workspace-level org role */
  orgRole: OrgRole;
  /** Layer 2: per-module roles (module_id → ModuleRole) */
  moduleRoles: Record<string, ModuleRole>;
  status: "active" | "invited" | "deactivated";
  lastActiveAt: string;
  joinedAt: string;
}

export type FeatureFlagStatus = "enabled" | "disabled" | "beta";

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string;
  module: string | null;
  status: FeatureFlagStatus;
  changedBy: string;
  changedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  details: string;
  timestamp: string;
}

// ─── Config ──────────────────────────────────────────────────────────

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "dark", label: "Dark (OLED)" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Default" },
  { value: "lg", label: "Large" },
];

export const FLAG_STATUS_CONFIG: Record<
  FeatureFlagStatus,
  { label: string; color: string; dotColor: string }
> = {
  enabled: {
    label: "Enabled",
    color: "bg-accent-success/15 text-accent-success",
    dotColor: "bg-accent-success",
  },
  disabled: {
    label: "Disabled",
    color: "bg-text-muted/15 text-text-muted",
    dotColor: "bg-text-muted",
  },
  beta: {
    label: "Beta",
    color: "bg-accent-warning/15 text-accent-warning",
    dotColor: "bg-accent-warning",
  },
};

export const MEMBER_STATUS_CONFIG: Record<
  WorkspaceMember["status"],
  { label: string; color: string }
> = {
  active: { label: "Active", color: "text-accent-success" },
  invited: { label: "Invited", color: "text-accent-warning" },
  deactivated: { label: "Deactivated", color: "text-text-muted" },
};

// ─── Seed Data (single founder — you are the first Airlock user) ──────

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  sidebarWidth: 240,
  fontSize: "md",
  reducedMotion: false,
  highContrast: false,
};

// The first and only user: the Architect/founder.
// Replace name/email once auth is wired to the real profile.
export const MOCK_MEMBERS: WorkspaceMember[] = [
  {
    id: "user_founder",
    name: "Founder",
    email: "you@airlock.dev",
    orgRole: "architect",
    headline: "Architect — building Airlock from zero",
    moduleRoles: {
      contracts: "owner",
      crm: "owner",
      tasks: "owner",
      calendar: "owner",
      documents: "owner",
    },
    status: "active",
    lastActiveAt: "2026-03-08T00:00:00Z",
    joinedAt: "2026-03-08T00:00:00Z",
  },
];

export const MOCK_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: "ff_001",
    key: "contracts_module",
    label: "Contracts Module",
    description: "Full contract lifecycle management with chambers and gates",
    module: "contracts",
    status: "enabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_002",
    key: "crm_module",
    label: "CRM Module",
    description: "Account management, leads, and deal pipeline",
    module: "crm",
    status: "enabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_003",
    key: "tasks_module",
    label: "Tasks Module",
    description: "Universal task queue with Kanban, inbox, and my-tasks views",
    module: "tasks",
    status: "enabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_004",
    key: "calendar_module",
    label: "Calendar Module",
    description: "Month grid and agenda views computed from vault dates",
    module: "calendar",
    status: "enabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_005",
    key: "documents_module",
    label: "Documents Module",
    description: "Document library with preview panel and file management",
    module: "documents",
    status: "enabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_006",
    key: "otto_ai",
    label: "Otto AI Agent",
    description: "AI-powered assistant for contract analysis and suggestions",
    module: null,
    status: "beta",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_007",
    key: "messenger",
    label: "Messenger",
    description: "Real-time messaging with vault threads and team channels",
    module: null,
    status: "disabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_008",
    key: "workflow_engine",
    label: "Workflow Engine",
    description: "Visual workflow builder with React Flow canvas",
    module: null,
    status: "disabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_009",
    key: "meeting_intelligence",
    label: "Meeting Intelligence",
    description: "Embedded video calls with post-call AI pipeline",
    module: null,
    status: "disabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_010",
    key: "extraction_heatmap",
    label: "Extraction Heatmap",
    description: "Visual confidence overlay on extracted contract fields",
    module: "contracts",
    status: "beta",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_011",
    key: "advanced_search",
    label: "Advanced Search (Cmd+K)",
    description: "Command palette with fuzzy search across all modules",
    module: null,
    status: "disabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "ff_012",
    key: "notifications",
    label: "Notification Center",
    description: "Toast system and notification panel with priority filters",
    module: null,
    status: "disabled",
    changedBy: "Founder",
    changedAt: "2026-03-08T00:00:00Z",
  },
];

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: "audit_001",
    action: "workspace.created",
    actor: "Founder",
    target: "My Airlock",
    details: "Initialized workspace as Architect",
    timestamp: "2026-03-08T00:00:00Z",
  },
  {
    id: "audit_002",
    action: "feature_flag.toggle",
    actor: "Founder",
    target: "contracts_module",
    details: "Enabled Contracts Module",
    timestamp: "2026-03-08T00:01:00Z",
  },
  {
    id: "audit_003",
    action: "feature_flag.toggle",
    actor: "Founder",
    target: "crm_module",
    details: "Enabled CRM Module",
    timestamp: "2026-03-08T00:01:30Z",
  },
];

// ─── Role System — Discord-Style ──────────────────────────────────────

export interface PermissionEntry {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  group: string;
  permissions: PermissionEntry[];
}

export const PERMISSION_CATALOG: PermissionGroup[] = [
  {
    group: "General Workspace",
    permissions: [
      {
        key: "view_vaults",
        label: "View Vaults",
        description: "View vault data, fields, and event history",
      },
      {
        key: "create_vaults",
        label: "Create Vaults",
        description: "Open new vaults in any module",
      },
      {
        key: "edit_vault_metadata",
        label: "Edit Vault Metadata",
        description: "Edit vault name, type, and metadata fields",
      },
      {
        key: "archive_vaults",
        label: "Archive Vaults",
        description: "Soft-archive vaults (reversible)",
      },
    ],
  },
  {
    group: "Extraction & Analysis",
    permissions: [
      {
        key: "view_extraction",
        label: "View Extraction",
        description: "View extraction results and confidence scores",
      },
      {
        key: "run_extraction",
        label: "Run Extraction",
        description: "Trigger extraction on documents",
      },
      {
        key: "configure_extraction",
        label: "Configure Extraction",
        description: "Edit anchors, synonyms, and extraction config",
      },
    ],
  },
  {
    group: "Patch Workflow",
    permissions: [
      {
        key: "create_patches",
        label: "Create Patches",
        description: "Draft field value corrections",
      },
      {
        key: "submit_patches",
        label: "Submit Patches",
        description: "Submit patch proposals for review",
      },
      {
        key: "approve_low_risk",
        label: "Approve Low Risk",
        description: "Approve low-confidence patch proposals",
      },
      {
        key: "approve_medium_risk",
        label: "Approve Medium Risk",
        description: "Approve medium-confidence patches",
      },
      {
        key: "approve_high_risk",
        label: "Approve High Risk",
        description: "Approve high-risk patches (Owner+ only)",
      },
      {
        key: "apply_patches",
        label: "Apply Patches",
        description: "Apply approved patches to the baseline record",
      },
    ],
  },
  {
    group: "Triage & Tasks",
    permissions: [
      {
        key: "view_triage",
        label: "View Triage",
        description: "View triage items and task queue",
      },
      {
        key: "create_triage",
        label: "Create Triage",
        description: "Create triage items",
      },
      {
        key: "resolve_triage",
        label: "Resolve Triage",
        description: "Resolve or dismiss triage items",
      },
      {
        key: "manage_tasks",
        label: "Manage Tasks",
        description: "Create, assign, and complete tasks",
      },
    ],
  },
  {
    group: "AI Agent",
    permissions: [
      {
        key: "chat_with_otto",
        label: "Chat with Otto",
        description: "Use the Otto AI agent",
      },
      {
        key: "configure_otto",
        label: "Configure Otto",
        description: "Edit Otto's roles, prompts, and tools",
      },
    ],
  },
  {
    group: "Export",
    permissions: [
      {
        key: "export_csv",
        label: "Export CSV",
        description: "Download vault data as CSV",
      },
      {
        key: "export_pdf",
        label: "Export PDF",
        description: "Download vault data as PDF",
      },
      {
        key: "export_json",
        label: "Export JSON",
        description: "Download vault data as JSON (Owner+ only)",
      },
    ],
  },
  {
    group: "Administration",
    permissions: [
      {
        key: "manage_members",
        label: "Manage Members",
        description: "Invite, deactivate, and change member roles",
      },
      {
        key: "manage_roles",
        label: "Manage Roles",
        description: "Create, edit, and delete custom roles",
      },
      {
        key: "toggle_features",
        label: "Toggle Features",
        description: "Enable or disable feature flags",
      },
      {
        key: "view_audit_log",
        label: "View Audit Log",
        description: "See all admin actions and role changes",
      },
      {
        key: "manage_integrations",
        label: "Manage Integrations",
        description: "Connect and configure external services",
      },
    ],
  },
];

// All permission keys (derived from catalog — single source of truth)
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

export interface RoleDefinition {
  id: string;
  name: string;
  color: string; // hex — used for the colored dot badge
  isSystem: boolean; // system roles cannot be deleted or renamed
  description: string;
  permissions: string[]; // list of permission keys
  memberCount: number;
  hierarchy: number; // 0 = highest authority
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: "architect",
    name: "Architect",
    color: "#00D1FF",
    isSystem: true,
    hierarchy: 0,
    description:
      "Workspace founder. Full permissions including self-promotion and role management.",
    permissions: ALL_PERMISSION_KEYS,
    memberCount: 1,
  },
  {
    id: "owner",
    name: "Owner",
    color: "#22C55E",
    isSystem: true,
    hierarchy: 1,
    description:
      "Module owners — promote vaults to Ship, configure modules, manage integrations.",
    permissions: [
      "view_vaults",
      "create_vaults",
      "edit_vault_metadata",
      "archive_vaults",
      "view_extraction",
      "run_extraction",
      "configure_extraction",
      "create_patches",
      "submit_patches",
      "approve_low_risk",
      "approve_medium_risk",
      "approve_high_risk",
      "apply_patches",
      "view_triage",
      "create_triage",
      "resolve_triage",
      "manage_tasks",
      "chat_with_otto",
      "configure_otto",
      "export_csv",
      "export_pdf",
      "export_json",
      "view_audit_log",
      "manage_integrations",
    ],
    memberCount: 0,
  },
  {
    id: "gatekeeper",
    name: "Gatekeeper",
    color: "#A855F7",
    isSystem: true,
    hierarchy: 2,
    description:
      "Reviewers — approve patches, resolve triage, advance through the Review chamber.",
    permissions: [
      "view_vaults",
      "view_extraction",
      "run_extraction",
      "create_patches",
      "submit_patches",
      "approve_low_risk",
      "approve_medium_risk",
      "view_triage",
      "create_triage",
      "resolve_triage",
      "manage_tasks",
      "chat_with_otto",
      "export_csv",
      "export_pdf",
      "view_audit_log",
    ],
    memberCount: 0,
  },
  {
    id: "builder",
    name: "Builder",
    color: "#EAB308",
    isSystem: true,
    hierarchy: 3,
    description:
      "Builders — draft records, assemble evidence, submit patches for review.",
    permissions: [
      "view_vaults",
      "create_vaults",
      "edit_vault_metadata",
      "view_extraction",
      "run_extraction",
      "create_patches",
      "submit_patches",
      "view_triage",
      "create_triage",
      "manage_tasks",
      "chat_with_otto",
      "export_csv",
      "export_pdf",
    ],
    memberCount: 0,
  },
  {
    id: "designer",
    name: "Designer",
    color: "#F97316",
    isSystem: true,
    hierarchy: 4,
    description:
      "Schema builders — configure extraction rules, build field schemas, operate in sandbox.",
    permissions: [
      "view_vaults",
      "view_extraction",
      "run_extraction",
      "configure_extraction",
      "view_triage",
      "chat_with_otto",
      "export_csv",
    ],
    memberCount: 0,
  },
  {
    id: "viewer",
    name: "Viewer",
    color: "#64748B",
    isSystem: true,
    hierarchy: 5,
    description:
      "Read-only access. Can see vault data and events but cannot take any action.",
    permissions: ["view_vaults", "view_extraction", "view_triage"],
    memberCount: 0,
  },
];

// Color palette for the role color picker
export const ROLE_COLOR_SWATCHES = [
  "#00D1FF", // Airlock cyan
  "#22C55E", // green
  "#A855F7", // purple
  "#EAB308", // yellow
  "#F97316", // orange
  "#EF4444", // red
  "#EC4899", // pink
  "#64748B", // slate
];
