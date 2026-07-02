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
  | "sla_warning"
  | "review_checkpoint"
  | "contract_prep"
  | "follow_up";

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
  review_checkpoint: {
    label: "Review Checkpoint",
    color: "bg-chamber-review/20 text-chamber-review",
    dotColor: "bg-chamber-review",
  },
  contract_prep: {
    label: "Contract Prep",
    color: "bg-accent-secondary/20 text-accent-secondary",
    dotColor: "bg-accent-secondary",
  },
  follow_up: {
    label: "Follow Up",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
  },
};

export const SOURCE_LABELS: Record<CalendarEventSource, string> = {
  contracts: "Contracts",
  crm: "CRM",
  tasks: "Tasks",
  calendar: "Calendar",
};

// --- Helpers ---

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// --- Mock events (music industry milestones, computed relative to today) ---

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "cal_001",
    title: "Urban Fauna EP Release",
    date: daysFromNow(14),
    eventType: "contract_start",
    source: "contracts",
    vaultSlug: "barclay-awal-release",
    vaultName: "Barclay Crenshaw — AWAL Digital Release",
    description: "Barclay's Urban Fauna EP goes live on all DSPs.",
    color: "bg-chamber-ship/20 text-chamber-ship",
    dotColor: "bg-chamber-ship",
    isAllDay: true,
  },
  {
    id: "cal_002",
    title: "Glass Frequencies Album Drop",
    date: daysFromNow(30),
    eventType: "contract_start",
    source: "contracts",
    vaultSlug: "nova-lux-empire-distro",
    vaultName: "Nova Lux — Empire Worldwide Distribution",
    description: "Nova Lux debut album — worldwide distribution via Empire.",
    color: "bg-chamber-ship/20 text-chamber-ship",
    dotColor: "bg-chamber-ship",
    isAllDay: true,
  },
  {
    id: "cal_003",
    title: "Nettwerk Sync License Expires",
    date: daysFromNow(90),
    eventType: "expiration",
    source: "contracts",
    vaultSlug: "jay-solis-nettwerk-sync",
    vaultName: "Jay Solis — Nettwerk Sync License",
    description: "Netflix sync placement license term ends.",
    color: "bg-accent-danger/20 text-accent-danger",
    dotColor: "bg-accent-danger",
    isAllDay: true,
  },
  {
    id: "cal_004",
    title: "Redbull Sound Stage Performance",
    date: daysFromNow(45),
    eventType: "contract_start",
    source: "contracts",
    vaultSlug: "portals-redbull-stage",
    vaultName: "The Portals — Redbull Sound Stage",
    description: "The Portals headline the Redbull Sound Stage.",
    color: "bg-chamber-ship/20 text-chamber-ship",
    dotColor: "bg-chamber-ship",
    isAllDay: true,
  },
  {
    id: "cal_005",
    title: "Empire Distribution Term Ends — Nova Lux",
    date: daysFromNow(1095),
    eventType: "contract_end",
    source: "contracts",
    vaultSlug: "nova-lux-empire-distro",
    vaultName: "Nova Lux — Empire Worldwide Distribution",
    description: "3-year distribution term expires. Evaluate renewal options.",
    color: "bg-accent-danger/20 text-accent-danger",
    dotColor: "bg-accent-danger",
    isAllDay: true,
  },
  {
    id: "cal_006",
    title: "Boiler Room Set Recording",
    date: daysFromNow(18),
    eventType: "contract_prep",
    source: "contracts",
    vaultSlug: "nova-lux-boiler-room",
    vaultName: "Nova Lux — Boiler Room Set Recording",
    description: "Live set recording session — Berlin. Confirm venue and crew.",
    color: "bg-accent-secondary/20 text-accent-secondary",
    dotColor: "bg-accent-secondary",
    isAllDay: false,
  },
  {
    id: "cal_007",
    title: "Jay Solis Listening Session",
    date: daysFromNow(4),
    eventType: "review_checkpoint",
    source: "contracts",
    vaultSlug: "jay-solis-producer-agreement",
    vaultName: "Jay Solis — Producer Agreement (Dex Rollins)",
    description: "Midnight Concrete LP preview with Jay, Dex, and the team.",
    color: "bg-chamber-review/20 text-chamber-review",
    dotColor: "bg-chamber-review",
    isAllDay: false,
  },
  {
    id: "cal_008",
    title: "Redbull Brand Approval Deadline",
    date: daysFromNow(7),
    eventType: "sla_warning",
    source: "contracts",
    vaultSlug: "portals-redbull-stage",
    vaultName: "The Portals — Redbull Sound Stage",
    description: "Redbull needs brand approval sign-off before production.",
    color: "bg-red-500/20 text-red-300",
    dotColor: "bg-red-400",
    isAllDay: false,
  },
  {
    id: "cal_009",
    title: "AWAL Royalty Review Due",
    date: daysFromNow(5),
    eventType: "task_due",
    source: "tasks",
    vaultSlug: "barclay-awal-release",
    vaultName: "Barclay Crenshaw — AWAL Digital Release",
    description: "Review Q1 royalty statement — $2,400 discrepancy flagged.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_010",
    title: "Pudgy Penguins Community Event Follow-up",
    date: daysFromNow(1),
    eventType: "follow_up",
    source: "crm",
    vaultSlug: null,
    vaultName: null,
    description:
      "Reply to Pudgy Penguins team about community listening party.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
  {
    id: "cal_011",
    title: "Barclay — Empire Negotiation Start",
    date: daysFromNow(10),
    eventType: "contract_prep",
    source: "contracts",
    vaultSlug: "barclay-direct-distro",
    vaultName: "Barclay Crenshaw — Direct Distribution Deal",
    description:
      "First negotiation session with Empire for Barclay's direct deal.",
    color: "bg-accent-secondary/20 text-accent-secondary",
    dotColor: "bg-accent-secondary",
    isAllDay: false,
  },
  {
    id: "cal_012",
    title: "Midnight Concrete LP Mastering Deadline",
    date: daysFromNow(21),
    eventType: "task_due",
    source: "tasks",
    vaultSlug: "jay-solis-producer-agreement",
    vaultName: "Jay Solis — Producer Agreement (Dex Rollins)",
    description: "Final masters due to AWAL for distribution prep.",
    color: "bg-accent-primary/20 text-accent-primary",
    dotColor: "bg-accent-primary",
    isAllDay: false,
  },
];
