export interface OperatorQueueItem {
  id: string;
  title: string;
  workspace: "contracts" | "vault" | "tasks" | "calendar" | "documents";
  urgency: "critical" | "high" | "normal";
  sourceType: "gate" | "message" | "workflow" | "deadline" | "review";
  accountLabel?: string;
  nextActionLabel: string;
  href: string;
}

export interface OperatorSignal {
  id: string;
  label: string;
  value: string;
  tone: "info" | "warning" | "critical";
}

export interface OperatorFeedItem {
  id: string;
  title: string;
  body: string;
  workspace: "contracts" | "vault" | "tasks" | "calendar" | "documents";
  actor: string;
  timeLabel: string;
}

export const MOCK_OPERATOR_QUEUE: OperatorQueueItem[] = [
  {
    id: "oq_001",
    title: "Northstar services agreement needs review routing",
    workspace: "contracts",
    urgency: "critical",
    sourceType: "gate",
    accountLabel: "Northstar Studios",
    nextActionLabel: "Open review gate",
    href: "/contracts/review-queue",
  },
  {
    id: "oq_002",
    title: "Leah Morgan sent a timing question from the dedicated line",
    workspace: "vault",
    urgency: "high",
    sourceType: "message",
    accountLabel: "Northstar Studios",
    nextActionLabel: "Reply from account memory",
    href: "/crm/inbox",
  },
  {
    id: "oq_003",
    title: "Summit renewal packet is due this week",
    workspace: "calendar",
    urgency: "high",
    sourceType: "deadline",
    accountLabel: "Summit Media",
    nextActionLabel: "Queue renewal outreach",
    href: "/crm/renewals",
  },
  {
    id: "oq_004",
    title: "Drive import created an unclassified onboarding packet",
    workspace: "documents",
    urgency: "normal",
    sourceType: "workflow",
    accountLabel: "Beacon Artists",
    nextActionLabel: "Attach to Vault",
    href: "/documents/library",
  },
  {
    id: "oq_005",
    title: "Entity review task is waiting on owner assignment",
    workspace: "tasks",
    urgency: "normal",
    sourceType: "review",
    accountLabel: "Atlas Creative Group",
    nextActionLabel: "Assign and continue",
    href: "/tasks/inbox",
  },
];

export const MOCK_OPERATOR_SIGNALS: OperatorSignal[] = [
  {
    id: "os_001",
    label: "Critical gates",
    value: "3 waiting",
    tone: "critical",
  },
  {
    id: "os_002",
    label: "Inbound threads",
    value: "5 unread",
    tone: "warning",
  },
  {
    id: "os_003",
    label: "Contracts ready",
    value: "2 ready for signature",
    tone: "info",
  },
  {
    id: "os_004",
    label: "Team coverage",
    value: "1 owner missing",
    tone: "warning",
  },
];

export const MOCK_OPERATOR_FEED: OperatorFeedItem[] = [
  {
    id: "of_001",
    title: "Beacon onboarding packet linked to account memory",
    body: "The upload was matched to Beacon Artists and a follow-up task bundle was created.",
    workspace: "documents",
    actor: "System",
    timeLabel: "8m ago",
  },
  {
    id: "of_002",
    title: "Northstar moved into Build",
    body: "The opportunity now has enough detail to stage a contract draft and begin internal review.",
    workspace: "vault",
    actor: "Ana Chen",
    timeLabel: "22m ago",
  },
  {
    id: "of_003",
    title: "Warner amendment marked ready for signature",
    body: "The signature stub advanced and downstream activation tasks were queued automatically.",
    workspace: "contracts",
    actor: "Demo Workflow",
    timeLabel: "41m ago",
  },
];
