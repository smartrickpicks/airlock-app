// ─── Types ───────────────────────────────────────────────────────────

export type NotificationType = "info" | "success" | "warning" | "error";

export type NotificationCategory =
  | "task"
  | "contract"
  | "crm"
  | "calendar"
  | "document"
  | "system";

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  category: NotificationCategory;
  module: string | null;
  href: string | null;
  read: boolean;
  createdAt: string; // ISO timestamp
}

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  type: NotificationType;
  duration?: number; // ms, default 4000
}

// ─── Config ──────────────────────────────────────────────────────────

export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  info: {
    label: "Info",
    icon: "i",
    color: "text-accent-primary",
    bgColor: "bg-accent-primary/10",
  },
  success: {
    label: "Success",
    icon: "\u2713",
    color: "text-accent-success",
    bgColor: "bg-accent-success/10",
  },
  warning: {
    label: "Warning",
    icon: "!",
    color: "text-accent-warning",
    bgColor: "bg-accent-warning/10",
  },
  error: {
    label: "Error",
    icon: "\u2717",
    color: "text-accent-danger",
    bgColor: "bg-accent-danger/10",
  },
};

export const NOTIFICATION_CATEGORY_CONFIG: Record<
  NotificationCategory,
  { label: string; icon: string }
> = {
  task: { label: "Tasks", icon: "\u2713" },
  contract: { label: "Contracts", icon: "\uD83D\uDD10" },
  crm: { label: "CRM", icon: "\uD83C\uDFE2" },
  calendar: { label: "Calendar", icon: "\uD83D\uDCC5" },
  document: { label: "Documents", icon: "\uD83D\uDCCE" },
  system: { label: "System", icon: "\u2699" },
};

// ─── Mock Notifications ──────────────────────────────────────────────

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n_01",
    title: "Gate approval required",
    body: "Distribution Agreement — Acme Records is pending Review gate approval.",
    type: "warning",
    category: "contract",
    module: "contracts",
    href: "/contracts/vault_001",
    read: false,
    createdAt: "2026-03-05T09:15:00Z",
  },
  {
    id: "n_02",
    title: "Task assigned to you",
    body: "Review territory clause — Acme Distribution has been assigned to you.",
    type: "info",
    category: "task",
    module: "tasks",
    href: "/tasks/inbox",
    read: false,
    createdAt: "2026-03-05T08:42:00Z",
  },
  {
    id: "n_03",
    title: "Contract moved to Ship",
    body: "NDA — Summit Publishing has been promoted to the Ship chamber.",
    type: "success",
    category: "contract",
    module: "contracts",
    href: "/contracts/vault_002",
    read: false,
    createdAt: "2026-03-05T07:30:00Z",
  },
  {
    id: "n_04",
    title: "Deal stage updated",
    body: "Horizon Media Group moved from Proposal to Negotiation.",
    type: "info",
    category: "crm",
    module: "crm",
    href: "/crm/pipeline",
    read: true,
    createdAt: "2026-03-04T16:20:00Z",
  },
  {
    id: "n_05",
    title: "Task overdue",
    body: "Update royalty schedule — Summit NDA is 2 days past due.",
    type: "error",
    category: "task",
    module: "tasks",
    href: "/tasks/inbox",
    read: false,
    createdAt: "2026-03-04T14:00:00Z",
  },
  {
    id: "n_06",
    title: "Calendar reminder",
    body: "Contract Renewal — Acme Records is in 10 days (Mar 15, 2026).",
    type: "warning",
    category: "calendar",
    module: "calendar",
    href: "/calendar/month",
    read: true,
    createdAt: "2026-03-04T10:00:00Z",
  },
  {
    id: "n_07",
    title: "Document uploaded",
    body: "Master Distribution Template v3 has been uploaded to the library.",
    type: "success",
    category: "document",
    module: "documents",
    href: "/documents/library",
    read: true,
    createdAt: "2026-03-03T15:45:00Z",
  },
  {
    id: "n_08",
    title: "New lead captured",
    body: "Apex Distributors has been added to the lead queue from web form.",
    type: "info",
    category: "crm",
    module: "crm",
    href: "/crm/leads",
    read: true,
    createdAt: "2026-03-03T11:30:00Z",
  },
  {
    id: "n_09",
    title: "Entity match conflict",
    body: "Verify entity match — Horizon Media has a potential duplicate in CRM.",
    type: "warning",
    category: "task",
    module: "tasks",
    href: "/tasks/inbox",
    read: false,
    createdAt: "2026-03-03T09:15:00Z",
  },
  {
    id: "n_10",
    title: "Feature flag changed",
    body: "AI Extraction Engine has been enabled for the workspace.",
    type: "info",
    category: "system",
    module: null,
    href: "/admin/features",
    read: true,
    createdAt: "2026-03-02T17:00:00Z",
  },
  {
    id: "n_11",
    title: "Gate override applied",
    body: "License Agreement — Horizon Media gate was overridden by Owner.",
    type: "warning",
    category: "contract",
    module: "contracts",
    href: "/contracts/vault_003",
    read: true,
    createdAt: "2026-03-02T14:30:00Z",
  },
  {
    id: "n_12",
    title: "Workspace backup completed",
    body: "Nightly backup completed successfully. 847 records archived.",
    type: "success",
    category: "system",
    module: null,
    href: null,
    read: true,
    createdAt: "2026-03-02T03:00:00Z",
  },
];
