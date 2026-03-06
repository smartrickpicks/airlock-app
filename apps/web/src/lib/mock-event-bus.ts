// ─── Types ───────────────────────────────────────────────────────────

export type QueueName =
  | "crm-events"
  | "tasks-events"
  | "calendar-events"
  | "notifications-events"
  | "admin-events"
  | "analytics-events";

export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed";

export type EventType =
  | "contract.shipped"
  | "contract.failed"
  | "entity.resolved"
  | "entity.new_customer"
  | "extraction.completed"
  | "health.updated"
  | "gate.advanced"
  | "patch.submitted"
  | "patch.approved"
  | "batch.completed"
  | "batch.failed"
  | "account.created"
  | "account.health_changed"
  | "task.created"
  | "task.overdue"
  | "sla.warning"
  | "sla.breached"
  | "feature.circuit_breaker";

export interface QueueStats {
  name: QueueName;
  pending: number;
  active: number;
  completed: number;
  failed: number;
  dlqSize: number;
  avgDurationMs: number;
  concurrency: number;
}

export interface EventBusJob {
  id: string;
  queueName: QueueName;
  eventType: EventType;
  status: JobStatus;
  sourceModule: string;
  sourceVaultId: string;
  workspaceId: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processedAt: string | null;
  failedAt: string | null;
  duration: number | null;
  error: string | null;
}

export interface DLQEntry {
  id: string;
  queueName: QueueName;
  jobId: string;
  eventType: EventType;
  sourceVaultId: string;
  errorMessage: string;
  retryCount: number;
  failedAt: string;
  payloadPreview: string;
}

export interface EventFlowPoint {
  timestamp: string;
  processed: number;
  failed: number;
}

export interface CrossModuleRoute {
  eventType: EventType;
  sourceModule: string;
  targetQueues: QueueName[];
}

// ─── Config ──────────────────────────────────────────────────────────

export const QUEUE_CONCURRENCY_CONFIG: Record<QueueName, number> = {
  "crm-events": 5,
  "tasks-events": 10,
  "calendar-events": 5,
  "notifications-events": 20,
  "admin-events": 3,
  "analytics-events": 3,
};

export const QUEUE_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dotColor: string }
> = {
  healthy: {
    label: "Healthy",
    color: "bg-accent-success/15 text-accent-success",
    dotColor: "bg-accent-success",
  },
  degraded: {
    label: "Degraded",
    color: "bg-accent-warning/15 text-accent-warning",
    dotColor: "bg-accent-warning",
  },
  critical: {
    label: "Critical",
    color: "bg-accent-error/15 text-accent-error",
    dotColor: "bg-accent-error",
  },
};

export const JOB_STATUS_CONFIG: Record<
  JobStatus,
  { label: string; color: string }
> = {
  waiting: { label: "Waiting", color: "text-text-muted" },
  active: { label: "Active", color: "text-accent-primary" },
  completed: { label: "Completed", color: "text-accent-success" },
  failed: { label: "Failed", color: "text-accent-error" },
  delayed: { label: "Delayed", color: "text-accent-warning" },
};

// ─── Mock Data ───────────────────────────────────────────────────────

export const MOCK_QUEUE_STATS: QueueStats[] = [
  {
    name: "crm-events",
    pending: 12,
    active: 3,
    completed: 124,
    failed: 2,
    dlqSize: 1,
    avgDurationMs: 45,
    concurrency: 5,
  },
  {
    name: "tasks-events",
    pending: 8,
    active: 6,
    completed: 210,
    failed: 1,
    dlqSize: 0,
    avgDurationMs: 32,
    concurrency: 10,
  },
  {
    name: "calendar-events",
    pending: 3,
    active: 1,
    completed: 67,
    failed: 0,
    dlqSize: 0,
    avgDurationMs: 28,
    concurrency: 5,
  },
  {
    name: "notifications-events",
    pending: 34,
    active: 12,
    completed: 452,
    failed: 4,
    dlqSize: 2,
    avgDurationMs: 18,
    concurrency: 20,
  },
  {
    name: "admin-events",
    pending: 1,
    active: 1,
    completed: 31,
    failed: 1,
    dlqSize: 1,
    avgDurationMs: 62,
    concurrency: 3,
  },
  {
    name: "analytics-events",
    pending: 5,
    active: 2,
    completed: 89,
    failed: 0,
    dlqSize: 1,
    avgDurationMs: 55,
    concurrency: 3,
  },
];

const now = new Date();
function minutesAgo(m: number): string {
  return new Date(now.getTime() - m * 60_000).toISOString();
}

export const MOCK_RECENT_JOBS: EventBusJob[] = [
  {
    id: "job_001",
    queueName: "crm-events",
    eventType: "contract.shipped",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_a1b",
    workspaceId: "ws_001",
    payload: {
      vault_id: "vault_a1b",
      entity_name: "Acme Records",
      contract_type: "Distribution",
    },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(45),
    processedAt: minutesAgo(44),
    failedAt: null,
    duration: 38,
    error: null,
  },
  {
    id: "job_002",
    queueName: "crm-events",
    eventType: "entity.resolved",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_c3d",
    workspaceId: "ws_001",
    payload: {
      vault_id: "vault_c3d",
      entity_name: "Summit Publishing",
      confidence: 0.94,
    },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(38),
    processedAt: minutesAgo(37),
    failedAt: null,
    duration: 42,
    error: null,
  },
  {
    id: "job_003",
    queueName: "crm-events",
    eventType: "entity.new_customer",
    status: "active",
    sourceModule: "contracts",
    sourceVaultId: "vault_e5f",
    workspaceId: "ws_001",
    payload: { entity_name: "Horizon Media", source_vault_id: "vault_e5f" },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(2),
    processedAt: null,
    failedAt: null,
    duration: null,
    error: null,
  },
  {
    id: "job_004",
    queueName: "tasks-events",
    eventType: "task.created",
    status: "completed",
    sourceModule: "tasks",
    sourceVaultId: "vault_g7h",
    workspaceId: "ws_001",
    payload: {
      task_id: "task_012",
      vault_id: "vault_g7h",
      assigned_to: "user_002",
    },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(30),
    processedAt: minutesAgo(29),
    failedAt: null,
    duration: 25,
    error: null,
  },
  {
    id: "job_005",
    queueName: "tasks-events",
    eventType: "contract.shipped",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_a1b",
    workspaceId: "ws_001",
    payload: { vault_id: "vault_a1b", entity_name: "Acme Records" },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(44),
    processedAt: minutesAgo(43),
    failedAt: null,
    duration: 31,
    error: null,
  },
  {
    id: "job_006",
    queueName: "tasks-events",
    eventType: "task.overdue",
    status: "failed",
    sourceModule: "tasks",
    sourceVaultId: "vault_i9j",
    workspaceId: "ws_001",
    payload: { task_id: "task_007", vault_id: "vault_i9j", overdue_by: "2h" },
    attempts: 3,
    maxAttempts: 3,
    createdAt: minutesAgo(20),
    processedAt: null,
    failedAt: minutesAgo(18),
    duration: null,
    error: "Handler timeout after 30s",
  },
  {
    id: "job_007",
    queueName: "calendar-events",
    eventType: "contract.shipped",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_a1b",
    workspaceId: "ws_001",
    payload: {
      vault_id: "vault_a1b",
      effective_date: "2026-01-15",
      term_end: "2028-01-15",
    },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(44),
    processedAt: minutesAgo(43),
    failedAt: null,
    duration: 22,
    error: null,
  },
  {
    id: "job_008",
    queueName: "calendar-events",
    eventType: "contract.shipped",
    status: "waiting",
    sourceModule: "contracts",
    sourceVaultId: "vault_k1l",
    workspaceId: "ws_001",
    payload: { vault_id: "vault_k1l", effective_date: "2026-03-01" },
    attempts: 0,
    maxAttempts: 3,
    createdAt: minutesAgo(1),
    processedAt: null,
    failedAt: null,
    duration: null,
    error: null,
  },
  {
    id: "job_009",
    queueName: "notifications-events",
    eventType: "patch.submitted",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_m2n",
    workspaceId: "ws_001",
    payload: {
      vault_id: "vault_m2n",
      patch_id: "patch_003",
      field: "territory",
    },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(15),
    processedAt: minutesAgo(14),
    failedAt: null,
    duration: 12,
    error: null,
  },
  {
    id: "job_010",
    queueName: "notifications-events",
    eventType: "gate.advanced",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_o3p",
    workspaceId: "ws_001",
    payload: { vault_id: "vault_o3p", from_gate: "discover", to_gate: "build" },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(22),
    processedAt: minutesAgo(21),
    failedAt: null,
    duration: 15,
    error: null,
  },
  {
    id: "job_011",
    queueName: "notifications-events",
    eventType: "health.updated",
    status: "active",
    sourceModule: "contracts",
    sourceVaultId: "vault_q4r",
    workspaceId: "ws_001",
    payload: { vault_id: "vault_q4r", old_score: 82, new_score: 68 },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(1),
    processedAt: null,
    failedAt: null,
    duration: null,
    error: null,
  },
  {
    id: "job_012",
    queueName: "notifications-events",
    eventType: "sla.breached",
    status: "failed",
    sourceModule: "system",
    sourceVaultId: "vault_s5t",
    workspaceId: "ws_001",
    payload: { vault_id: "vault_s5t", sla_type: "review_deadline" },
    attempts: 3,
    maxAttempts: 3,
    createdAt: minutesAgo(10),
    processedAt: null,
    failedAt: minutesAgo(8),
    duration: null,
    error: "ConnectionError: PostgreSQL connection pool exhausted",
  },
  {
    id: "job_013",
    queueName: "notifications-events",
    eventType: "patch.approved",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_u6v",
    workspaceId: "ws_001",
    payload: {
      vault_id: "vault_u6v",
      patch_id: "patch_001",
      approver_id: "user_002",
    },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(35),
    processedAt: minutesAgo(34),
    failedAt: null,
    duration: 11,
    error: null,
  },
  {
    id: "job_014",
    queueName: "admin-events",
    eventType: "contract.failed",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_w7x",
    workspaceId: "ws_001",
    payload: {
      vault_id: "vault_w7x",
      error: "extraction_timeout",
      batch_id: "batch_002",
    },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(25),
    processedAt: minutesAgo(24),
    failedAt: null,
    duration: 58,
    error: null,
  },
  {
    id: "job_015",
    queueName: "admin-events",
    eventType: "sla.breached",
    status: "failed",
    sourceModule: "system",
    sourceVaultId: "vault_y8z",
    workspaceId: "ws_002",
    payload: { vault_id: "vault_y8z", sla_type: "response_time" },
    attempts: 3,
    maxAttempts: 3,
    createdAt: minutesAgo(12),
    processedAt: null,
    failedAt: minutesAgo(10),
    duration: null,
    error: "WorkspaceViolationError: Cross-workspace event rejected",
  },
  {
    id: "job_016",
    queueName: "admin-events",
    eventType: "task.overdue",
    status: "waiting",
    sourceModule: "tasks",
    sourceVaultId: "vault_a2b",
    workspaceId: "ws_001",
    payload: { task_id: "task_015", overdue_by: "4h" },
    attempts: 0,
    maxAttempts: 3,
    createdAt: minutesAgo(3),
    processedAt: null,
    failedAt: null,
    duration: null,
    error: null,
  },
  {
    id: "job_017",
    queueName: "analytics-events",
    eventType: "extraction.completed",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_c4d",
    workspaceId: "ws_001",
    payload: { vault_id: "vault_c4d", field_count: 24, confidence_avg: 0.87 },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(18),
    processedAt: minutesAgo(17),
    failedAt: null,
    duration: 48,
    error: null,
  },
  {
    id: "job_018",
    queueName: "analytics-events",
    eventType: "gate.advanced",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_e6f",
    workspaceId: "ws_001",
    payload: { vault_id: "vault_e6f", from_gate: "build", to_gate: "review" },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(28),
    processedAt: minutesAgo(27),
    failedAt: null,
    duration: 52,
    error: null,
  },
  {
    id: "job_019",
    queueName: "analytics-events",
    eventType: "batch.completed",
    status: "delayed",
    sourceModule: "contracts",
    sourceVaultId: "vault_g8h",
    workspaceId: "ws_001",
    payload: { batch_id: "batch_005", total: 50, passed: 47, failed: 3 },
    attempts: 2,
    maxAttempts: 3,
    createdAt: minutesAgo(5),
    processedAt: null,
    failedAt: null,
    duration: null,
    error: "Temporary Redis connection timeout — retrying",
  },
  {
    id: "job_020",
    queueName: "notifications-events",
    eventType: "batch.completed",
    status: "completed",
    sourceModule: "contracts",
    sourceVaultId: "vault_g8h",
    workspaceId: "ws_001",
    payload: { batch_id: "batch_005", total: 50, passed: 47, failed: 3 },
    attempts: 1,
    maxAttempts: 3,
    createdAt: minutesAgo(5),
    processedAt: minutesAgo(4),
    failedAt: null,
    duration: 14,
    error: null,
  },
];

export const MOCK_DLQ_ENTRIES: DLQEntry[] = [
  {
    id: "dlq_001",
    queueName: "crm-events",
    jobId: "job_098",
    eventType: "entity.new_customer",
    sourceVaultId: "vault_dlq1",
    errorMessage:
      "IntegrityError: duplicate key value violates unique constraint on counterparty_vault",
    retryCount: 3,
    failedAt: minutesAgo(120),
    payloadPreview:
      '{"event_type":"entity.new_customer","workspace_id":"ws_001","source_vault_id":"vault_dlq1","payload":{"entity_name":"Horizon Media","extracted_fields":{"name":"Hori...',
  },
  {
    id: "dlq_002",
    queueName: "notifications-events",
    jobId: "job_112",
    eventType: "sla.breached",
    sourceVaultId: "vault_dlq2",
    errorMessage:
      "ConnectionError: PostgreSQL connection pool exhausted after 30s timeout",
    retryCount: 3,
    failedAt: minutesAgo(95),
    payloadPreview:
      '{"event_type":"sla.breached","workspace_id":"ws_001","source_vault_id":"vault_dlq2","payload":{"sla_type":"review_deadline","vault_id":"vault_dlq2","overdue_by":"6...',
  },
  {
    id: "dlq_003",
    queueName: "notifications-events",
    jobId: "job_134",
    eventType: "health.updated",
    sourceVaultId: "vault_dlq3",
    errorMessage:
      "TypeError: Cannot read properties of undefined (reading 'notification_preferences')",
    retryCount: 3,
    failedAt: minutesAgo(60),
    payloadPreview:
      '{"event_type":"health.updated","workspace_id":"ws_001","source_vault_id":"vault_dlq3","payload":{"vault_id":"vault_dlq3","old_score":75,"new_score":42,"band":"cri...',
  },
  {
    id: "dlq_004",
    queueName: "admin-events",
    jobId: "job_089",
    eventType: "feature.circuit_breaker",
    sourceVaultId: "vault_dlq4",
    errorMessage:
      "WorkspaceViolationError: Cross-workspace event rejected — event workspace ws_002 does not match vault workspace ws_001",
    retryCount: 3,
    failedAt: minutesAgo(45),
    payloadPreview:
      '{"event_type":"feature.circuit_breaker","workspace_id":"ws_002","source_vault_id":"vault_dlq4","payload":{"batch_id":"batch_003","failure_rate":0.55,"threshold":0...',
  },
  {
    id: "dlq_005",
    queueName: "analytics-events",
    jobId: "job_156",
    eventType: "extraction.completed",
    sourceVaultId: "vault_dlq5",
    errorMessage: "TimeoutError: Handler execution exceeded 30s limit",
    retryCount: 3,
    failedAt: minutesAgo(30),
    payloadPreview:
      '{"event_type":"extraction.completed","workspace_id":"ws_001","source_vault_id":"vault_dlq5","payload":{"vault_id":"vault_dlq5","field_count":142,"pass":98,"revie...',
  },
];

export const MOCK_EVENT_FLOW: EventFlowPoint[] = Array.from(
  { length: 30 },
  (_, i) => {
    const base = 30 + Math.round(15 * Math.sin(i * 0.4));
    const noise = Math.round(Math.abs(Math.sin(i * 2.7)) * 10 - 5);
    return {
      timestamp: minutesAgo(29 - i),
      processed: Math.max(15, base + noise),
      failed:
        i % 8 === 3 || i % 11 === 7
          ? Math.round(Math.abs(Math.sin(i)) * 3) + 1
          : 0,
    };
  },
);

export const EVENT_ROUTES: CrossModuleRoute[] = [
  {
    eventType: "contract.shipped",
    sourceModule: "contracts",
    targetQueues: [
      "crm-events",
      "tasks-events",
      "calendar-events",
      "notifications-events",
    ],
  },
  {
    eventType: "contract.failed",
    sourceModule: "contracts",
    targetQueues: ["admin-events", "notifications-events"],
  },
  {
    eventType: "entity.resolved",
    sourceModule: "contracts",
    targetQueues: ["crm-events"],
  },
  {
    eventType: "entity.new_customer",
    sourceModule: "contracts",
    targetQueues: ["crm-events", "tasks-events"],
  },
  {
    eventType: "extraction.completed",
    sourceModule: "contracts",
    targetQueues: ["analytics-events"],
  },
  {
    eventType: "health.updated",
    sourceModule: "contracts",
    targetQueues: ["notifications-events"],
  },
  {
    eventType: "gate.advanced",
    sourceModule: "contracts",
    targetQueues: ["notifications-events", "analytics-events"],
  },
  {
    eventType: "patch.submitted",
    sourceModule: "contracts",
    targetQueues: ["notifications-events"],
  },
  {
    eventType: "patch.approved",
    sourceModule: "contracts",
    targetQueues: ["notifications-events"],
  },
  {
    eventType: "batch.completed",
    sourceModule: "contracts",
    targetQueues: ["notifications-events", "analytics-events"],
  },
  {
    eventType: "batch.failed",
    sourceModule: "contracts",
    targetQueues: ["admin-events", "notifications-events"],
  },
  {
    eventType: "account.created",
    sourceModule: "crm",
    targetQueues: ["notifications-events"],
  },
  {
    eventType: "account.health_changed",
    sourceModule: "crm",
    targetQueues: ["notifications-events"],
  },
  {
    eventType: "task.created",
    sourceModule: "tasks",
    targetQueues: ["notifications-events"],
  },
  {
    eventType: "task.overdue",
    sourceModule: "tasks",
    targetQueues: ["notifications-events", "admin-events"],
  },
  {
    eventType: "sla.warning",
    sourceModule: "system",
    targetQueues: ["notifications-events"],
  },
  {
    eventType: "sla.breached",
    sourceModule: "system",
    targetQueues: ["notifications-events", "admin-events"],
  },
  {
    eventType: "feature.circuit_breaker",
    sourceModule: "system",
    targetQueues: ["admin-events", "notifications-events"],
  },
];
