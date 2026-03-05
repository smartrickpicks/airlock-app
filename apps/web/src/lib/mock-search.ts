// ─── Types ───────────────────────────────────────────────────────────

export type SearchItemType =
  | "vault"
  | "contract"
  | "account"
  | "lead"
  | "task"
  | "document"
  | "event"
  | "page"
  | "action";

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  type: SearchItemType;
  module: string;
  href: string;
  keywords: string[];
}

// ─── Config ──────────────────────────────────────────────────────────

export const SEARCH_TYPE_CONFIG: Record<
  SearchItemType,
  { label: string; icon: string; color: string }
> = {
  vault: { label: "Vault", icon: "🔐", color: "text-accent-primary" },
  contract: { label: "Contract", icon: "📄", color: "text-chamber-review" },
  account: { label: "Account", icon: "🏢", color: "text-accent-secondary" },
  lead: { label: "Lead", icon: "👤", color: "text-accent-warning" },
  task: { label: "Task", icon: "✓", color: "text-accent-success" },
  document: { label: "Document", icon: "📎", color: "text-chamber-build" },
  event: { label: "Event", icon: "📅", color: "text-chamber-discover" },
  page: { label: "Page", icon: "→", color: "text-text-secondary" },
  action: { label: "Action", icon: "⚡", color: "text-accent-primary" },
};

// ─── Mock Searchable Items ───────────────────────────────────────────

export const SEARCH_INDEX: SearchItem[] = [
  // Vaults
  {
    id: "s_v01",
    title: "Distribution Agreement — Acme Records",
    subtitle: "Contracts · Review Chamber",
    type: "vault",
    module: "contracts",
    href: "/contracts/vault_001",
    keywords: ["distribution", "acme", "agreement", "vault"],
  },
  {
    id: "s_v02",
    title: "NDA — Summit Publishing",
    subtitle: "Contracts · Ship Chamber",
    type: "vault",
    module: "contracts",
    href: "/contracts/vault_002",
    keywords: ["nda", "summit", "publishing", "non-disclosure"],
  },
  {
    id: "s_v03",
    title: "License Agreement — Horizon Media",
    subtitle: "Contracts · Build Chamber",
    type: "vault",
    module: "contracts",
    href: "/contracts/vault_003",
    keywords: ["license", "horizon", "media"],
  },
  {
    id: "s_v04",
    title: "MSA — Apex Distributors",
    subtitle: "Contracts · Discover Chamber",
    type: "vault",
    module: "contracts",
    href: "/contracts/vault_004",
    keywords: ["msa", "apex", "master service"],
  },

  // CRM Accounts
  {
    id: "s_a01",
    title: "Acme Records",
    subtitle: "CRM · Enterprise · Health 85",
    type: "account",
    module: "crm",
    href: "/crm/accounts",
    keywords: ["acme", "records", "enterprise", "account"],
  },
  {
    id: "s_a02",
    title: "Summit Publishing",
    subtitle: "CRM · Mid-Market · Health 72",
    type: "account",
    module: "crm",
    href: "/crm/accounts",
    keywords: ["summit", "publishing", "mid-market"],
  },
  {
    id: "s_a03",
    title: "Horizon Media Group",
    subtitle: "CRM · Enterprise · Health 91",
    type: "account",
    module: "crm",
    href: "/crm/accounts",
    keywords: ["horizon", "media", "enterprise"],
  },

  // Tasks
  {
    id: "s_t01",
    title: "Review territory clause — Acme Distribution",
    subtitle: "Tasks · Contracts · Urgent",
    type: "task",
    module: "tasks",
    href: "/tasks/inbox",
    keywords: ["review", "territory", "clause", "urgent"],
  },
  {
    id: "s_t02",
    title: "Update royalty schedule — Summit NDA",
    subtitle: "Tasks · Contracts · Warning",
    type: "task",
    module: "tasks",
    href: "/tasks/inbox",
    keywords: ["update", "royalty", "schedule", "warning"],
  },
  {
    id: "s_t03",
    title: "Verify entity match — Horizon Media",
    subtitle: "Tasks · CRM · Blocker",
    type: "task",
    module: "tasks",
    href: "/tasks/inbox",
    keywords: ["verify", "entity", "match", "blocker"],
  },
  {
    id: "s_t04",
    title: "Complete onboarding checklist",
    subtitle: "Tasks · General · Info",
    type: "task",
    module: "tasks",
    href: "/tasks/my-tasks",
    keywords: ["onboarding", "checklist", "setup"],
  },

  // Documents
  {
    id: "s_d01",
    title: "Master Distribution Template v3",
    subtitle: "Documents · Template · PDF",
    type: "document",
    module: "documents",
    href: "/documents/library",
    keywords: ["master", "distribution", "template", "pdf"],
  },
  {
    id: "s_d02",
    title: "NDA Standard Form",
    subtitle: "Documents · Template · DOCX",
    type: "document",
    module: "documents",
    href: "/documents/library",
    keywords: ["nda", "standard", "form", "docx"],
  },
  {
    id: "s_d03",
    title: "Q1 Revenue Report",
    subtitle: "Documents · Report · XLSX",
    type: "document",
    module: "documents",
    href: "/documents/library",
    keywords: ["q1", "revenue", "report", "xlsx"],
  },

  // Calendar Events
  {
    id: "s_e01",
    title: "Contract Renewal — Acme Records",
    subtitle: "Calendar · Mar 15, 2026",
    type: "event",
    module: "calendar",
    href: "/calendar/month",
    keywords: ["renewal", "acme", "march"],
  },
  {
    id: "s_e02",
    title: "NDA Expiration — Summit Publishing",
    subtitle: "Calendar · Mar 30, 2026",
    type: "event",
    module: "calendar",
    href: "/calendar/month",
    keywords: ["expiration", "summit", "nda"],
  },

  // Navigation Pages
  {
    id: "s_p01",
    title: "Contracts — Triage Dashboard",
    subtitle: "Navigate to contract triage view",
    type: "page",
    module: "contracts",
    href: "/contracts/triage",
    keywords: ["contracts", "triage", "dashboard"],
  },
  {
    id: "s_p02",
    title: "Contracts — Generator",
    subtitle: "Navigate to contract generator",
    type: "page",
    module: "contracts",
    href: "/contracts/generator",
    keywords: ["contracts", "generator", "create"],
  },
  {
    id: "s_p03",
    title: "Contracts — Review Queue",
    subtitle: "Navigate to review queue",
    type: "page",
    module: "contracts",
    href: "/contracts/review-queue",
    keywords: ["review", "queue", "approval"],
  },
  {
    id: "s_p04",
    title: "CRM — Accounts",
    subtitle: "Navigate to CRM accounts",
    type: "page",
    module: "crm",
    href: "/crm/accounts",
    keywords: ["crm", "accounts"],
  },
  {
    id: "s_p05",
    title: "CRM — Pipeline",
    subtitle: "Navigate to deal pipeline",
    type: "page",
    module: "crm",
    href: "/crm/pipeline",
    keywords: ["crm", "pipeline", "deals", "kanban"],
  },
  {
    id: "s_p06",
    title: "CRM — Leads",
    subtitle: "Navigate to lead triage",
    type: "page",
    module: "crm",
    href: "/crm/leads",
    keywords: ["crm", "leads", "triage"],
  },
  {
    id: "s_p07",
    title: "Tasks — Inbox",
    subtitle: "Navigate to task inbox",
    type: "page",
    module: "tasks",
    href: "/tasks/inbox",
    keywords: ["tasks", "inbox"],
  },
  {
    id: "s_p08",
    title: "Tasks — Kanban Board",
    subtitle: "Navigate to task board",
    type: "page",
    module: "tasks",
    href: "/tasks/board",
    keywords: ["tasks", "kanban", "board"],
  },
  {
    id: "s_p09",
    title: "Calendar — Month View",
    subtitle: "Navigate to calendar month",
    type: "page",
    module: "calendar",
    href: "/calendar/month",
    keywords: ["calendar", "month"],
  },
  {
    id: "s_p10",
    title: "Calendar — Agenda",
    subtitle: "Navigate to agenda view",
    type: "page",
    module: "calendar",
    href: "/calendar/agenda",
    keywords: ["calendar", "agenda"],
  },
  {
    id: "s_p11",
    title: "Document Library",
    subtitle: "Navigate to document library",
    type: "page",
    module: "documents",
    href: "/documents/library",
    keywords: ["documents", "library", "files"],
  },
  {
    id: "s_p12",
    title: "Admin & Settings",
    subtitle: "Navigate to admin settings",
    type: "page",
    module: "admin",
    href: "/admin",
    keywords: ["admin", "settings", "configuration"],
  },
  {
    id: "s_p13",
    title: "Feature Flags",
    subtitle: "Navigate to feature control plane",
    type: "page",
    module: "admin",
    href: "/admin/features",
    keywords: ["feature", "flags", "control", "toggle"],
  },
  {
    id: "s_p14",
    title: "Members",
    subtitle: "Navigate to workspace members",
    type: "page",
    module: "admin",
    href: "/admin/members",
    keywords: ["members", "users", "team", "roles"],
  },

  // Quick Actions
  {
    id: "s_ac01",
    title: "Create New Vault",
    subtitle: "Start a new contract vault",
    type: "action",
    module: "contracts",
    href: "/contracts/triage",
    keywords: ["create", "new", "vault", "contract"],
  },
  {
    id: "s_ac02",
    title: "Generate Contract",
    subtitle: "Open the contract generator wizard",
    type: "action",
    module: "contracts",
    href: "/contracts/generator",
    keywords: ["generate", "contract", "wizard"],
  },
];
