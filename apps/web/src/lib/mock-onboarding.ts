/* ─── Mock Onboarding Data ─────────────────────────────────────── */

export type OnboardingPhase = "day1" | "week1" | "week2plus";

export type WizardStep =
  | "create_workspace"
  | "module_config"
  | "invite_team"
  | "connect_data"
  | "ready";

export type IndustryOption =
  | "music"
  | "legal"
  | "finance"
  | "healthcare"
  | "technology"
  | "other";

export type DataSourceType = "google_drive" | "upload" | "api";

export type UserChecklistItemId =
  | "login"
  | "view_home"
  | "open_contracts"
  | "view_vault"
  | "submit_patch"
  | "use_search"
  | "customize_home";

export type AdminChecklistItemId =
  | "create_workspace"
  | "enable_modules"
  | "invite_team"
  | "connect_source"
  | "upload_batch"
  | "configure_flags"
  | "set_calibration"
  | "review_results";

export interface ChecklistItem<T extends string = string> {
  id: T;
  label: string;
  completed: boolean;
}

export interface WelcomeSlide {
  title: string;
  description: string;
  icon: string; // lucide icon name
}

export interface InviteeEntry {
  email: string;
  role: "builder" | "gatekeeper" | "owner";
}

export interface WorkspaceSetupState {
  workspaceName: string;
  industry: IndustryOption | "";
  enabledModules: string[];
  invitees: InviteeEntry[];
  dataSource: DataSourceType | null;
  loadDemoData: boolean;
}

/* ─── Welcome Slides by Role ───────────────────────────────────── */

export const WELCOME_SLIDES: Record<string, WelcomeSlide[]> = {
  builder: [
    {
      title: "Find Issues, Fix Data",
      description:
        "Your job is to discover issues in contracts, fix data, and submit patches for review.",
      icon: "wrench",
    },
    {
      title: "Start in Triage Board",
      description:
        "The Triage Board shows contracts that need attention. This is your launchpad.",
      icon: "layout-list",
    },
    {
      title: "Explore Your Vaults",
      description:
        "Open assigned vaults to inspect extracted data, edit fields, and submit corrections.",
      icon: "vault",
    },
  ],
  gatekeeper: [
    {
      title: "Review & Approve Work",
      description:
        "Your job is to review patches submitted by Builders, and approve or reject them.",
      icon: "shield-check",
    },
    {
      title: "Start in Review Queue",
      description:
        "The Review Queue shows pending patches and approvals waiting for your attention.",
      icon: "list-checks",
    },
    {
      title: "Check Patch Approvals",
      description:
        "Each patch shows what changed, who submitted it, and the confidence scores.",
      icon: "file-diff",
    },
  ],
  owner: [
    {
      title: "Manage Team & Quality",
      description:
        "Your job is to oversee the workspace, manage roles, and ensure data quality.",
      icon: "crown",
    },
    {
      title: "Start in Admin",
      description:
        "The Admin overlay lets you manage members, feature flags, and system health.",
      icon: "settings",
    },
    {
      title: "Monitor System Health",
      description:
        "Track extraction accuracy, approval rates, and team productivity from your dashboard.",
      icon: "activity",
    },
  ],
};

/* ─── User Onboarding Checklist ────────────────────────────────── */

export const USER_CHECKLIST_ITEMS: ChecklistItem<UserChecklistItemId>[] = [
  { id: "login", label: "Log in to Airlock", completed: false },
  { id: "view_home", label: "View your Home page", completed: false },
  {
    id: "open_contracts",
    label: "Open the Contracts module",
    completed: false,
  },
  {
    id: "view_vault",
    label: "View a vault in the Record Inspector",
    completed: false,
  },
  { id: "submit_patch", label: "Submit your first patch", completed: false },
  { id: "use_search", label: "Use Cmd+K to search", completed: false },
  { id: "customize_home", label: "Customize your Home page", completed: false },
];

/* ─── Admin Onboarding Checklist ───────────────────────────────── */

export const ADMIN_CHECKLIST_ITEMS: ChecklistItem<AdminChecklistItemId>[] = [
  { id: "create_workspace", label: "Create workspace", completed: false },
  { id: "enable_modules", label: "Enable modules", completed: false },
  { id: "invite_team", label: "Invite team members", completed: false },
  {
    id: "connect_source",
    label: "Connect data source",
    completed: false,
  },
  { id: "upload_batch", label: "Upload first batch", completed: false },
  {
    id: "configure_flags",
    label: "Configure feature flags",
    completed: false,
  },
  {
    id: "set_calibration",
    label: "Set calibration thresholds",
    completed: false,
  },
  {
    id: "review_results",
    label: "Review first batch results",
    completed: false,
  },
];

/* ─── Module Options ───────────────────────────────────────────── */

export interface ModuleOption {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
}

export const MODULE_OPTIONS: ModuleOption[] = [
  {
    id: "contracts",
    name: "Contracts",
    description: "Contract lifecycle management",
    defaultEnabled: true,
  },
  {
    id: "crm",
    name: "CRM",
    description: "Customer relationships",
    defaultEnabled: true,
  },
  {
    id: "tasks",
    name: "Tasks",
    description: "Work tracking",
    defaultEnabled: true,
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Scheduling",
    defaultEnabled: false,
  },
  {
    id: "documents",
    name: "Documents",
    description: "Document library",
    defaultEnabled: false,
  },
];

/* ─── Industry Options ─────────────────────────────────────────── */

export const INDUSTRY_OPTIONS: { value: IndustryOption; label: string }[] = [
  { value: "music", label: "Music & Entertainment" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance & Banking" },
  { value: "healthcare", label: "Healthcare" },
  { value: "technology", label: "Technology" },
  { value: "other", label: "Other" },
];

/* ─── Data Source Options ──────────────────────────────────────── */

export const DATA_SOURCE_OPTIONS: {
  type: DataSourceType;
  label: string;
  description: string;
}[] = [
  {
    type: "google_drive",
    label: "Google Drive",
    description: "Connect folder of PDFs",
  },
  {
    type: "upload",
    label: "Upload",
    description: "Upload files manually",
  },
  {
    type: "api",
    label: "API",
    description: "Configure API ingest",
  },
];

/* ─── Wizard Step Config ───────────────────────────────────────── */

export const WIZARD_STEPS: { id: WizardStep; label: string; number: number }[] =
  [
    { id: "create_workspace", label: "Create Workspace", number: 1 },
    { id: "module_config", label: "Modules", number: 2 },
    { id: "invite_team", label: "Invite Team", number: 3 },
    { id: "connect_data", label: "Data Source", number: 4 },
    { id: "ready", label: "Ready", number: 5 },
  ];
