// ─── Types ───────────────────────────────────────────────────────────

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "auth_expired";

export type RealtimeTopic =
  | "vault:*"
  | "vault:vault_001"
  | "vault:vault_002"
  | "vault:vault_003"
  | "vault:vault_004"
  | "tasks:*"
  | "crm:*"
  | "calendar:*"
  | "notifications:*"
  | "presence:*";

export interface PresenceUser {
  id: string;
  name: string;
  initials: string;
  status: "online" | "away" | "busy";
  currentPage: string | null;
  lastSeenAt: string;
}

export interface RealtimeEvent {
  id: string;
  topic: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ─── Config ──────────────────────────────────────────────────────────

export const CONNECTION_STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: string; dotColor: string }
> = {
  connected: {
    label: "Connected",
    color: "text-accent-success",
    dotColor: "bg-accent-success",
  },
  disconnected: {
    label: "Disconnected",
    color: "text-accent-danger",
    dotColor: "bg-accent-danger",
  },
  reconnecting: {
    label: "Reconnecting...",
    color: "text-accent-warning",
    dotColor: "bg-accent-warning",
  },
  auth_expired: {
    label: "Session Expired",
    color: "text-accent-danger",
    dotColor: "bg-accent-danger",
  },
};

// ─── Mock Presence Data ──────────────────────────────────────────────

export const MOCK_PRESENCE: PresenceUser[] = [
  {
    id: "user_01",
    name: "Jane Builder",
    initials: "JB",
    status: "online",
    currentPage: "/contracts/vault_001",
    lastSeenAt: "2026-03-05T09:30:00Z",
  },
  {
    id: "user_02",
    name: "Tom Gatekeeper",
    initials: "TG",
    status: "online",
    currentPage: "/contracts/review-queue",
    lastSeenAt: "2026-03-05T09:28:00Z",
  },
  {
    id: "user_03",
    name: "Sarah Owner",
    initials: "SO",
    status: "away",
    currentPage: null,
    lastSeenAt: "2026-03-05T08:45:00Z",
  },
  {
    id: "user_04",
    name: "Mike Analyst",
    initials: "MA",
    status: "busy",
    currentPage: "/crm/pipeline",
    lastSeenAt: "2026-03-05T09:25:00Z",
  },
  {
    id: "user_05",
    name: "Lisa Coordinator",
    initials: "LC",
    status: "online",
    currentPage: "/tasks/board",
    lastSeenAt: "2026-03-05T09:29:00Z",
  },
];

// ─── Mock Realtime Events ────────────────────────────────────────────

export const MOCK_REALTIME_EVENTS: RealtimeEvent[] = [
  {
    id: "rt_01",
    topic: "vault:vault_001",
    type: "patch.submitted",
    payload: {
      vaultId: "vault_001",
      field: "territory_clause",
      actor: "Jane Builder",
    },
    timestamp: "2026-03-05T09:15:00Z",
  },
  {
    id: "rt_02",
    topic: "vault:vault_002",
    type: "chamber.promoted",
    payload: {
      vaultId: "vault_002",
      from: "review",
      to: "ship",
      actor: "Sarah Owner",
    },
    timestamp: "2026-03-05T07:30:00Z",
  },
  {
    id: "rt_03",
    topic: "tasks:*",
    type: "task.assigned",
    payload: {
      taskId: "t_01",
      assignee: "Jane Builder",
      title: "Review territory clause",
    },
    timestamp: "2026-03-05T08:42:00Z",
  },
  {
    id: "rt_04",
    topic: "crm:*",
    type: "deal.stage_changed",
    payload: {
      dealId: "deal_03",
      from: "proposal",
      to: "negotiation",
      rep: "Mike Analyst",
    },
    timestamp: "2026-03-04T16:20:00Z",
  },
  {
    id: "rt_05",
    topic: "notifications:*",
    type: "notification.new",
    payload: { notificationId: "n_05", title: "Task overdue" },
    timestamp: "2026-03-04T14:00:00Z",
  },
];
