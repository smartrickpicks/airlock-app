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
  orgRole: "member" | "lead" | "director" | "executive";
  moduleRoles: Record<string, string>;
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

export const ORG_ROLE_LABELS: Record<WorkspaceMember["orgRole"], string> = {
  member: "Member",
  lead: "Lead",
  director: "Director",
  executive: "Executive",
};

// ─── Mock Data ───────────────────────────────────────────────────────

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  sidebarWidth: 240,
  fontSize: "md",
  reducedMotion: false,
  highContrast: false,
};

export const MOCK_MEMBERS: WorkspaceMember[] = [
  {
    id: "user_001",
    name: "Jane Builder",
    email: "jane@airlock.dev",
    orgRole: "executive",
    moduleRoles: {
      contracts: "owner",
      crm: "builder",
      tasks: "builder",
      calendar: "viewer",
      documents: "builder",
    },
    status: "active",
    lastActiveAt: "2026-03-05T14:30:00Z",
    joinedAt: "2025-11-01T09:00:00Z",
  },
  {
    id: "user_002",
    name: "Tom Gatekeeper",
    email: "tom@airlock.dev",
    orgRole: "director",
    moduleRoles: {
      contracts: "gatekeeper",
      crm: "viewer",
      tasks: "gatekeeper",
      calendar: "viewer",
      documents: "gatekeeper",
    },
    status: "active",
    lastActiveAt: "2026-03-05T12:15:00Z",
    joinedAt: "2025-11-15T09:00:00Z",
  },
  {
    id: "user_003",
    name: "Sarah Owner",
    email: "sarah@airlock.dev",
    orgRole: "lead",
    moduleRoles: {
      contracts: "builder",
      crm: "builder",
      tasks: "viewer",
      calendar: "viewer",
      documents: "viewer",
    },
    status: "active",
    lastActiveAt: "2026-03-04T18:00:00Z",
    joinedAt: "2025-12-01T09:00:00Z",
  },
  {
    id: "user_004",
    name: "Alex Reviewer",
    email: "alex@airlock.dev",
    orgRole: "member",
    moduleRoles: {
      contracts: "gatekeeper",
      crm: "viewer",
      tasks: "viewer",
      calendar: "viewer",
      documents: "viewer",
    },
    status: "active",
    lastActiveAt: "2026-03-03T10:45:00Z",
    joinedAt: "2026-01-10T09:00:00Z",
  },
  {
    id: "user_005",
    name: "Morgan New",
    email: "morgan@airlock.dev",
    orgRole: "member",
    moduleRoles: {},
    status: "invited",
    lastActiveAt: "",
    joinedAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "user_006",
    name: "Pat Former",
    email: "pat@airlock.dev",
    orgRole: "member",
    moduleRoles: {
      contracts: "viewer",
    },
    status: "deactivated",
    lastActiveAt: "2026-02-15T16:00:00Z",
    joinedAt: "2025-11-20T09:00:00Z",
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
    changedBy: "Jane Builder",
    changedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "ff_002",
    key: "crm_module",
    label: "CRM Module",
    description: "Account management, leads, and deal pipeline",
    module: "crm",
    status: "enabled",
    changedBy: "Jane Builder",
    changedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "ff_003",
    key: "tasks_module",
    label: "Tasks Module",
    description: "Universal task queue with Kanban, inbox, and my-tasks views",
    module: "tasks",
    status: "enabled",
    changedBy: "Jane Builder",
    changedAt: "2026-02-20T14:00:00Z",
  },
  {
    id: "ff_004",
    key: "calendar_module",
    label: "Calendar Module",
    description: "Month grid and agenda views computed from vault dates",
    module: "calendar",
    status: "enabled",
    changedBy: "Jane Builder",
    changedAt: "2026-02-25T09:00:00Z",
  },
  {
    id: "ff_005",
    key: "documents_module",
    label: "Documents Module",
    description: "Document library with preview panel and file management",
    module: "documents",
    status: "enabled",
    changedBy: "Jane Builder",
    changedAt: "2026-03-01T11:00:00Z",
  },
  {
    id: "ff_006",
    key: "otto_ai",
    label: "Otto AI Agent",
    description: "AI-powered assistant for contract analysis and suggestions",
    module: null,
    status: "beta",
    changedBy: "Tom Gatekeeper",
    changedAt: "2026-03-03T15:00:00Z",
  },
  {
    id: "ff_007",
    key: "messenger",
    label: "Messenger",
    description: "Real-time messaging with vault threads and team channels",
    module: null,
    status: "disabled",
    changedBy: "Jane Builder",
    changedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "ff_008",
    key: "workflow_engine",
    label: "Workflow Engine",
    description: "Visual workflow builder with React Flow canvas",
    module: null,
    status: "disabled",
    changedBy: "Jane Builder",
    changedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "ff_009",
    key: "meeting_intelligence",
    label: "Meeting Intelligence",
    description: "Embedded video calls with post-call AI pipeline",
    module: null,
    status: "disabled",
    changedBy: "Jane Builder",
    changedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "ff_010",
    key: "extraction_heatmap",
    label: "Extraction Heatmap",
    description: "Visual confidence overlay on extracted contract fields",
    module: "contracts",
    status: "beta",
    changedBy: "Tom Gatekeeper",
    changedAt: "2026-03-02T08:30:00Z",
  },
  {
    id: "ff_011",
    key: "advanced_search",
    label: "Advanced Search (Cmd+K)",
    description: "Command palette with fuzzy search across all modules",
    module: null,
    status: "disabled",
    changedBy: "Jane Builder",
    changedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "ff_012",
    key: "notifications",
    label: "Notification Center",
    description: "Toast system and notification panel with priority filters",
    module: null,
    status: "disabled",
    changedBy: "Jane Builder",
    changedAt: "2026-02-01T10:00:00Z",
  },
];

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: "audit_001",
    action: "feature_flag.toggle",
    actor: "Tom Gatekeeper",
    target: "extraction_heatmap",
    details: "Enabled beta flag for Extraction Heatmap",
    timestamp: "2026-03-02T08:30:00Z",
  },
  {
    id: "audit_002",
    action: "member.role_change",
    actor: "Jane Builder",
    target: "Alex Reviewer",
    details: "Changed org role from member to lead",
    timestamp: "2026-03-01T14:00:00Z",
  },
  {
    id: "audit_003",
    action: "feature_flag.toggle",
    actor: "Jane Builder",
    target: "documents_module",
    details: "Enabled Documents Module",
    timestamp: "2026-03-01T11:00:00Z",
  },
  {
    id: "audit_004",
    action: "member.invited",
    actor: "Jane Builder",
    target: "Morgan New",
    details: "Sent workspace invitation to morgan@airlock.dev",
    timestamp: "2026-03-01T09:00:00Z",
  },
  {
    id: "audit_005",
    action: "workspace.setting_change",
    actor: "Jane Builder",
    target: "workspace",
    details: "Updated workspace name to 'Airlock Demo'",
    timestamp: "2026-02-28T16:00:00Z",
  },
  {
    id: "audit_006",
    action: "member.deactivated",
    actor: "Jane Builder",
    target: "Pat Former",
    details: "Deactivated user account",
    timestamp: "2026-02-15T16:00:00Z",
  },
  {
    id: "audit_007",
    action: "feature_flag.toggle",
    actor: "Tom Gatekeeper",
    target: "otto_ai",
    details: "Enabled beta flag for Otto AI Agent",
    timestamp: "2026-03-03T15:00:00Z",
  },
  {
    id: "audit_008",
    action: "member.module_role",
    actor: "Jane Builder",
    target: "Tom Gatekeeper",
    details: "Assigned gatekeeper role for Tasks module",
    timestamp: "2026-02-20T10:00:00Z",
  },
];
