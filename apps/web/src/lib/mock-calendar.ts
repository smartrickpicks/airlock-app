/**
 * Mock Calendar data — computed calendar events.
 * Calendar doesn't store its own events. It renders dates from:
 * 1. Vault extracted dates (effective, termination, renewal, expiry)
 * 2. Task due dates from the universal task table.
 * Remove this file once the API + Postgres are available.
 */

// --- Types ---

export type CalendarEventType =
  | "contract_start"
  | "contract_end"
  | "renewal_deadline"
  | "expiration"
  | "task_due"
  | "sla_warning";

export type CalendarEventSource = "contracts" | "crm" | "tasks" | "calendar";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string
  eventType: CalendarEventType;
  source: CalendarEventSource;
  vaultSlug: string | null;
  vaultName: string | null;
  description: string;
  color: string; // Tailwind class
  dotColor: string; // Tailwind class for dot
  isAllDay: boolean;
}

// --- Config ---

export const EVENT_TYPE_CONFIG: Record<
  CalendarEventType,
  { label: string; color: string; dotColor: string }
> = {
  contract_start: {
    label: "Contract Start",
    color: "bg-chamber-ship/20 text-chamber-ship",
    dotColor: "bg-chamber-ship",
  },
  contract_end: {
    label: "Contract End",
    color: "bg-accent-danger/20 text-accent-danger",
    dotColor: "bg-accent-danger",
  },
  renewal_deadline: {
    label: "Renewal Deadline",
    color: "bg-amber-500/20 text-amber-400",
    dotColor: "bg-amber-400",
  },
  expiration: {
    label: "Expiration",
    color: "bg-accent-danger/20 text-accent-danger",
    dotColor: "bg-accent-danger",
  },
  task_due: {
    label: "Task Due",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
  },
  sla_warning: {
    label: "SLA Warning",
    color: "bg-red-500/20 text-red-300",
    dotColor: "bg-red-400",
  },
};

export const SOURCE_LABELS: Record<CalendarEventSource, string> = {
  contracts: "Contracts",
  crm: "CRM",
  tasks: "Tasks",
  calendar: "Calendar",
};

// --- Mock events (spanning March 2026) ---

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  // Vault dates — contract lifecycle
  {
    id: "cal_001",
    title: "Henderson MSA — Renewal Deadline",
    date: "2026-03-05T17:00:00Z",
    eventType: "renewal_deadline",
    source: "contracts",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    description: "Contract renewal due — initiate renewal process.",
    color: "bg-amber-500/20 text-amber-400",
    dotColor: "bg-amber-400",
    isAllDay: true,
  },
  {
    id: "cal_002",
    title: "Nova Entertainment MSA — Effective Date",
    date: "2026-03-01T00:00:00Z",
    eventType: "contract_start",
    source: "contracts",
    vaultSlug: "nova-msa",
    vaultName: "Nova Entertainment MSA",
    description: "Contract effective date.",
    color: "bg-chamber-ship/20 text-chamber-ship",
    dotColor: "bg-chamber-ship",
    isAllDay: true,
  },
  {
    id: "cal_003",
    title: "Summit Distribution — Termination Date",
    date: "2026-04-01T00:00:00Z",
    eventType: "contract_end",
    source: "contracts",
    vaultSlug: "summit-dist",
    vaultName: "Summit Distribution",
    description: "Distribution agreement expires — renew or close.",
    color: "bg-accent-danger/20 text-accent-danger",
    dotColor: "bg-accent-danger",
    isAllDay: true,
  },
  {
    id: "cal_004",
    title: "TechFlow NDA — Effective Date",
    date: "2026-03-10T00:00:00Z",
    eventType: "contract_start",
    source: "contracts",
    vaultSlug: "techflow-nda",
    vaultName: "TechFlow NDA",
    description: "NDA effective date.",
    color: "bg-chamber-ship/20 text-chamber-ship",
    dotColor: "bg-chamber-ship",
    isAllDay: true,
  },
  {
    id: "cal_005",
    title: "Ostereo Music MSA — Renewal Deadline",
    date: "2026-03-20T17:00:00Z",
    eventType: "renewal_deadline",
    source: "contracts",
    vaultSlug: "ostereo-msa",
    vaultName: "Ostereo Music MSA",
    description: "MSA renewal due.",
    color: "bg-amber-500/20 text-amber-400",
    dotColor: "bg-amber-400",
    isAllDay: true,
  },
  {
    id: "cal_006",
    title: "Warner Amendment — Expiration",
    date: "2026-03-28T00:00:00Z",
    eventType: "expiration",
    source: "contracts",
    vaultSlug: "warner-amend",
    vaultName: "Warner Amendment",
    description: "Amendment expires if not renewed.",
    color: "bg-accent-danger/20 text-accent-danger",
    dotColor: "bg-accent-danger",
    isAllDay: true,
  },

  // Task due dates
  {
    id: "cal_007",
    title: "Missing indemnification cap — Task Due",
    date: "2026-03-06T17:00:00Z",
    eventType: "task_due",
    source: "tasks",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    description:
      "Blocker: Section 8.2 references liability cap but no dollar amount.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_008",
    title: "Entity resolution: Summit Media — Task Due",
    date: "2026-03-07T12:00:00Z",
    eventType: "task_due",
    source: "tasks",
    vaultSlug: "summit-dist",
    vaultName: "Summit Distribution",
    description: "Ambiguous entity detected — multiple matches.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_009",
    title: "Send proposal to Nova — Task Due",
    date: "2026-03-10T17:00:00Z",
    eventType: "task_due",
    source: "crm",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    description: "Draft and send formal proposal.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_010",
    title: "Follow up: Summit renewal — Task Due",
    date: "2026-03-08T17:00:00Z",
    eventType: "task_due",
    source: "crm",
    vaultSlug: "summit-dist",
    vaultName: "Summit Distribution",
    description: "Renewal due in 11 days — schedule call.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_011",
    title: "Review Q1 contract report — Task Due",
    date: "2026-03-12T17:00:00Z",
    eventType: "task_due",
    source: "tasks",
    vaultSlug: null,
    vaultName: null,
    description: "Compile and review quarterly contract metrics.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_012",
    title: "Prepare extraction config — Task Due",
    date: "2026-03-09T17:00:00Z",
    eventType: "task_due",
    source: "tasks",
    vaultSlug: "warner-amend",
    vaultName: "Warner Amendment",
    description: "Set up field extraction rules for Warner Bros contract type.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_013",
    title: "Draft SLA policy — Task Due",
    date: "2026-03-06T17:00:00Z",
    eventType: "task_due",
    source: "tasks",
    vaultSlug: null,
    vaultName: null,
    description: "Create SLA escalation policy for review workflows.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_014",
    title: "Henderson MSA renewal — SLA Warning",
    date: "2026-03-15T17:00:00Z",
    eventType: "sla_warning",
    source: "contracts",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    description: "Contract renewal due — SLA warning at 10 days.",
    color: "bg-red-500/20 text-red-300",
    dotColor: "bg-red-400",
    isAllDay: false,
  },
  {
    id: "cal_015",
    title: "Quarterly compliance review — Task Due",
    date: "2026-03-31T17:00:00Z",
    eventType: "task_due",
    source: "calendar",
    vaultSlug: null,
    vaultName: null,
    description: "Scheduled compliance review for all active contracts.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_016",
    title: "Onboard Acme Inc: schedule kickoff — Task Due",
    date: "2026-03-07T17:00:00Z",
    eventType: "task_due",
    source: "crm",
    vaultSlug: "acme-msa",
    vaultName: "Acme Inc MSA",
    description: "Schedule kickoff call with Acme Inc stakeholders.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_017",
    title: "Update team onboarding docs — Task Due",
    date: "2026-03-14T17:00:00Z",
    eventType: "task_due",
    source: "tasks",
    vaultSlug: null,
    vaultName: null,
    description: "Refresh onboarding documentation for new hires.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_018",
    title: "Ostereo review SLA breach — SLA Warning",
    date: "2026-03-05T13:00:00Z",
    eventType: "sla_warning",
    source: "contracts",
    vaultSlug: "ostereo-msa",
    vaultName: "Ostereo Music MSA",
    description: "Review SLA breached by 4 hours.",
    color: "bg-red-500/20 text-red-300",
    dotColor: "bg-red-400",
    isAllDay: false,
  },
  {
    id: "cal_019",
    title: "Schedule discovery call: MediaWorks — Task Due",
    date: "2026-03-07T17:00:00Z",
    eventType: "task_due",
    source: "crm",
    vaultSlug: null,
    vaultName: null,
    description: "MQL lead accepted — needs discovery call.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_020",
    title: "Gate review: TechFlow preflight — Task Due",
    date: "2026-03-08T17:00:00Z",
    eventType: "task_due",
    source: "contracts",
    vaultSlug: "techflow-nda",
    vaultName: "TechFlow NDA",
    description: "TechFlow Inc vault ready for Discover gate review.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
];
