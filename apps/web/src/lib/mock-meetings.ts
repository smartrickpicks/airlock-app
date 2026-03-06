/**
 * Mock Meeting Intelligence data
 * Cross-cutting capability — NOT a module
 */

/* ── Types ────────────────────────────────────────────── */

export type MeetingStatus =
  | "scheduled"
  | "joining"
  | "active"
  | "ended"
  | "processing"
  | "ready"
  | "cancelled"
  | "abandoned"
  | "failed";

export type TranscriptSource = "gemini" | "vexa" | "merged" | "manual";

export type SentimentLabel = "positive" | "neutral" | "negative";

export type ActionItemUrgency = "high" | "medium" | "low";

export interface MeetingParticipant {
  id: string;
  email: string;
  displayName: string;
  rsvpStatus: "accepted" | "declined" | "tentative" | "pending";
  attended: boolean;
  joinedAt?: string;
  leftAt?: string;
}

export interface Meeting {
  id: string;
  workspaceId: string;
  vaultId: string | null;
  vaultName: string | null;
  module: string | null;
  title: string;
  description: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  durationSeconds: number | null;
  status: MeetingStatus;
  organizerId: string;
  participants: MeetingParticipant[];
  createdAt: string;
}

export interface ActionItem {
  description: string;
  assigneeName: string | null;
  assigneeId: string | null;
  suggestedDue: string | null;
  taskId: string | null;
  urgency: ActionItemUrgency;
  context: string;
}

export interface MeetingTopic {
  name: string;
  confidence: number;
  threadId: string | null;
}

export interface MeetingSentiment {
  overall: SentimentLabel;
  score: number;
  perParticipant?: Record<string, { sentiment: SentimentLabel; score: number }>;
}

export interface MeetingSummary {
  oneLiner: string;
  bullets: string[];
  keyDecisions: string[];
}

export interface MeetingIntelligence {
  meetingId: string;
  transcriptSource: TranscriptSource;
  rawTranscript: string | null;
  summary: MeetingSummary;
  actionItems: ActionItem[];
  topics: MeetingTopic[];
  sentiment: MeetingSentiment;
  processedAt: string;
  processingModel: string;
}

export interface PrepBriefAttendee {
  contactId: string;
  name: string;
  company: string;
  role: string;
  lastInteraction: string;
  interactionCount: number;
  sentimentTrend: SentimentLabel;
  openActionItems: { description: string; due: string; status: string }[];
}

export interface PrepBriefRelatedMeeting {
  meetingId: string;
  date: string;
  title: string;
  participants: string[];
  summary: string;
  unresolvedItems: string[];
}

export interface PrepBriefVault {
  vaultId: string;
  name: string;
  module: string;
  chamber: string;
  health: number;
  recentActivity: string;
}

export interface PrepBriefTopicThread {
  topic: string;
  firstMentioned: string;
  meetingCount: number;
  keyDecisions: string[];
  relatedVaultNames: string[];
}

export interface PrepBrief {
  meetingId: string;
  generatedAt: string;
  attendeeProfiles: PrepBriefAttendee[];
  relatedMeetings: PrepBriefRelatedMeeting[];
  activeVaults: PrepBriefVault[];
  openTasks: {
    taskId: string;
    title: string;
    assignee: string;
    due: string;
    status: string;
  }[];
  topicThreads: PrepBriefTopicThread[];
}

export interface ConversationThread {
  id: string;
  workspaceId: string;
  topic: string;
  firstMentioned: string;
  lastMentioned: string;
  mentionCount: number;
  status: "active" | "resolved" | "stale";
  linkedMeetingIds: string[];
  linkedVaultNames: string[];
}

export interface TranscriptEntry {
  speaker: string;
  timestamp: string;
  content: string;
  isActionItem?: boolean;
}

/* ── Status config ────────────────────────────────────── */

export const MEETING_STATUS_CONFIG: Record<
  MeetingStatus,
  { label: string; color: string }
> = {
  scheduled: { label: "Scheduled", color: "bg-blue-500" },
  joining: { label: "Joining", color: "bg-cyan-500" },
  active: { label: "In Progress", color: "bg-accent-success" },
  ended: { label: "Ended", color: "bg-text-muted" },
  processing: { label: "Processing", color: "bg-yellow-500" },
  ready: { label: "Ready", color: "bg-accent-success" },
  cancelled: { label: "Cancelled", color: "bg-text-muted" },
  abandoned: { label: "Abandoned", color: "bg-text-muted" },
  failed: { label: "Failed", color: "bg-accent-error" },
};

export const URGENCY_CONFIG: Record<
  ActionItemUrgency,
  { label: string; color: string }
> = {
  high: { label: "High", color: "text-accent-error" },
  medium: { label: "Medium", color: "text-yellow-400" },
  low: { label: "Low", color: "text-text-muted" },
};

export const SENTIMENT_CONFIG: Record<
  SentimentLabel,
  { label: string; color: string; icon: string }
> = {
  positive: { label: "Positive", color: "text-accent-success", icon: "+" },
  neutral: { label: "Neutral", color: "text-text-muted", icon: "~" },
  negative: { label: "Negative", color: "text-accent-error", icon: "-" },
};

/* ── Helpers ──────────────────────────────────────────── */

function hoursFromNow(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return d.toISOString();
}

function daysAgo(d: number, hour = 14): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function addMinutes(iso: string, mins: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

/* ── Mock participants ────────────────────────────────── */

const BILLY: MeetingParticipant = {
  id: "mp_billy",
  email: "billy@airlock.app",
  displayName: "Billy Chen",
  rsvpStatus: "accepted",
  attended: true,
  joinedAt: daysAgo(4, 14),
};

const DAVE: MeetingParticipant = {
  id: "mp_dave",
  email: "dave@airlock.app",
  displayName: "Dave Ruiz",
  rsvpStatus: "accepted",
  attended: true,
};

const JACK: MeetingParticipant = {
  id: "mp_jack",
  email: "jburke@nova.com",
  displayName: "Jack Burke",
  rsvpStatus: "accepted",
  attended: true,
};

const ANA: MeetingParticipant = {
  id: "mp_ana",
  email: "ana@airlock.app",
  displayName: "Ana Chen",
  rsvpStatus: "accepted",
  attended: true,
};

const SARAH: MeetingParticipant = {
  id: "mp_sarah",
  email: "sarah@airlock.app",
  displayName: "Sarah Kim",
  rsvpStatus: "accepted",
  attended: false,
};

const MIKE: MeetingParticipant = {
  id: "mp_mike",
  email: "mike@summit.com",
  displayName: "Mike Torres",
  rsvpStatus: "pending",
  attended: false,
};

/* ── Mock meetings ────────────────────────────────────── */

const upcoming1Start = hoursFromNow(26);
const upcoming2Start = hoursFromNow(72);

export const MOCK_MEETINGS: Meeting[] = [
  // Upcoming
  {
    id: "mtg_001",
    workspaceId: "ws_1",
    vaultId: "vault_nova",
    vaultName: "Nova Entertainment",
    module: "crm",
    title: "Nova Entertainment — Q2 Planning",
    description: "Review Q2 marketing rollout plan and budget allocation",
    scheduledStart: upcoming1Start,
    scheduledEnd: addMinutes(upcoming1Start, 30),
    actualStart: null,
    actualEnd: null,
    durationSeconds: null,
    status: "scheduled",
    organizerId: "mem_billy",
    participants: [
      { ...BILLY, attended: false, joinedAt: undefined },
      { ...JACK, rsvpStatus: "pending", attended: false },
    ],
    createdAt: daysAgo(1),
  },
  {
    id: "mtg_002",
    workspaceId: "ws_1",
    vaultId: "vault_summit",
    vaultName: "Summit Publishing",
    module: "contracts",
    title: "Summit Distribution Agreement Review",
    description: "Final review of distribution terms before Ship chamber",
    scheduledStart: upcoming2Start,
    scheduledEnd: addMinutes(upcoming2Start, 45),
    actualStart: null,
    actualEnd: null,
    durationSeconds: null,
    status: "scheduled",
    organizerId: "mem_ana",
    participants: [
      { ...ANA, attended: false, joinedAt: undefined },
      { ...MIKE, rsvpStatus: "tentative" },
      { ...SARAH, rsvpStatus: "accepted" },
    ],
    createdAt: daysAgo(0),
  },
  // Past — ready
  {
    id: "mtg_003",
    workspaceId: "ws_1",
    vaultId: "vault_nova",
    vaultName: "Nova Entertainment",
    module: "crm",
    title: "Nova Entertainment — Marketing Review",
    description: "Review marketing initiative progress",
    scheduledStart: daysAgo(4, 14),
    scheduledEnd: daysAgo(4, 14) ? addMinutes(daysAgo(4, 14), 30) : "",
    actualStart: daysAgo(4, 14),
    actualEnd: addMinutes(daysAgo(4, 14), 33),
    durationSeconds: 1980,
    status: "ready",
    organizerId: "mem_billy",
    participants: [BILLY, DAVE],
    createdAt: daysAgo(5),
  },
  {
    id: "mtg_004",
    workspaceId: "ws_1",
    vaultId: "vault_nova",
    vaultName: "Nova Entertainment",
    module: "crm",
    title: "Nova — Contract Renewal Check-in",
    description: "Status on contract renewal terms",
    scheduledStart: daysAgo(8, 10),
    scheduledEnd: addMinutes(daysAgo(8, 10), 30),
    actualStart: daysAgo(8, 10),
    actualEnd: addMinutes(daysAgo(8, 10), 28),
    durationSeconds: 1680,
    status: "ready",
    organizerId: "mem_billy",
    participants: [BILLY, JACK],
    createdAt: daysAgo(10),
  },
  {
    id: "mtg_005",
    workspaceId: "ws_1",
    vaultId: "vault_summit",
    vaultName: "Summit Publishing",
    module: "contracts",
    title: "Summit — Terms Negotiation",
    description: "Negotiate final distribution terms",
    scheduledStart: daysAgo(12, 15),
    scheduledEnd: addMinutes(daysAgo(12, 15), 60),
    actualStart: daysAgo(12, 15),
    actualEnd: addMinutes(daysAgo(12, 15), 52),
    durationSeconds: 3120,
    status: "ready",
    organizerId: "mem_ana",
    participants: [ANA, JACK, SARAH],
    createdAt: daysAgo(14),
  },
  {
    id: "mtg_006",
    workspaceId: "ws_1",
    vaultId: "vault_nova",
    vaultName: "Nova Entertainment",
    module: "crm",
    title: "Nova — Kickoff Meeting",
    description: "Initial partnership discussion",
    scheduledStart: daysAgo(20, 11),
    scheduledEnd: addMinutes(daysAgo(20, 11), 45),
    actualStart: daysAgo(20, 11),
    actualEnd: addMinutes(daysAgo(20, 11), 42),
    durationSeconds: 2520,
    status: "ready",
    organizerId: "mem_billy",
    participants: [BILLY, JACK, DAVE],
    createdAt: daysAgo(22),
  },
  // Processing
  {
    id: "mtg_007",
    workspaceId: "ws_1",
    vaultId: "vault_meridian",
    vaultName: "Meridian Records",
    module: "crm",
    title: "Meridian — Quarterly Sync",
    description: "Quarterly business review",
    scheduledStart: daysAgo(1, 16),
    scheduledEnd: addMinutes(daysAgo(1, 16), 30),
    actualStart: daysAgo(1, 16),
    actualEnd: addMinutes(daysAgo(1, 16), 35),
    durationSeconds: 2100,
    status: "processing",
    organizerId: "mem_dave",
    participants: [DAVE, ANA],
    createdAt: daysAgo(3),
  },
  // Cancelled
  {
    id: "mtg_008",
    workspaceId: "ws_1",
    vaultId: "vault_nova",
    vaultName: "Nova Entertainment",
    module: "crm",
    title: "Nova — Budget Follow-up (Cancelled)",
    description: "Rescheduled to next week",
    scheduledStart: daysAgo(2, 14),
    scheduledEnd: addMinutes(daysAgo(2, 14), 30),
    actualStart: null,
    actualEnd: null,
    durationSeconds: null,
    status: "cancelled",
    organizerId: "mem_billy",
    participants: [
      { ...BILLY, attended: false },
      { ...JACK, attended: false },
    ],
    createdAt: daysAgo(4),
  },
];

/* ── Mock intelligence ────────────────────────────────── */

export const MOCK_INTELLIGENCE: Record<string, MeetingIntelligence> = {
  mtg_003: {
    meetingId: "mtg_003",
    transcriptSource: "gemini",
    rawTranscript: null,
    summary: {
      oneLiner: "Agreed on Q2 marketing timeline with $50K budget allocation",
      bullets: [
        "Q2 rollout plan finalized: launch April 15",
        "Budget: $50K allocated from marketing reserve",
        "Dave to coordinate with design team on creative assets",
        "Follow-up meeting scheduled for March 15",
      ],
      keyDecisions: [
        "April 15 launch date confirmed",
        "Budget approved at $50K",
      ],
    },
    actionItems: [
      {
        description: "Send Q2 rollout plan document",
        assigneeName: "Dave Ruiz",
        assigneeId: "mem_dave",
        suggestedDue: hoursFromNow(72),
        taskId: "t_ai_001",
        urgency: "high",
        context:
          "Dave committed to delivering the rollout plan by end of week.",
      },
      {
        description: "Coordinate with design team on creative assets",
        assigneeName: "Dave Ruiz",
        assigneeId: "mem_dave",
        suggestedDue: hoursFromNow(168),
        taskId: "t_ai_002",
        urgency: "medium",
        context:
          "Dave will reach out to the design team for Q2 campaign visuals.",
      },
      {
        description: "Review budget allocation with CFO",
        assigneeName: "Billy Chen",
        assigneeId: "mem_billy",
        suggestedDue: hoursFromNow(48),
        taskId: null,
        urgency: "high",
        context:
          "Billy needs CFO sign-off on the $50K marketing reserve drawdown.",
      },
    ],
    topics: [
      { name: "marketing initiative", confidence: 0.95, threadId: "thr_001" },
      { name: "Q2 planning", confidence: 0.88, threadId: "thr_002" },
      { name: "budget allocation", confidence: 0.82, threadId: null },
    ],
    sentiment: { overall: "positive", score: 0.82 },
    processedAt: addMinutes(daysAgo(4, 14), 38),
    processingModel: "claude-sonnet",
  },
  mtg_004: {
    meetingId: "mtg_004",
    transcriptSource: "gemini",
    rawTranscript: null,
    summary: {
      oneLiner:
        "Contract renewal terms discussed — Jack requesting territory expansion",
      bullets: [
        "Jack proposed expanding territory to include APAC region",
        "Current contract expires June 30 — 90-day renewal window",
        "Pricing adjustment requested: 8% increase for expanded territory",
        "Billy to prepare revised terms for legal review",
      ],
      keyDecisions: [
        "APAC expansion approved in principle, pending legal review",
      ],
    },
    actionItems: [
      {
        description: "Prepare revised contract terms with APAC territory",
        assigneeName: "Billy Chen",
        assigneeId: "mem_billy",
        suggestedDue: daysAgo(-5),
        taskId: "t_ai_003",
        urgency: "high",
        context: "Billy committed to drafting revised terms within one week.",
      },
      {
        description: "Send APAC market research data",
        assigneeName: "Jack Burke",
        assigneeId: null,
        suggestedDue: daysAgo(-3),
        taskId: null,
        urgency: "medium",
        context:
          "Jack will share Nova's APAC market analysis to support the expansion case.",
      },
    ],
    topics: [
      { name: "contract renewal", confidence: 0.96, threadId: "thr_003" },
      { name: "territory expansion", confidence: 0.91, threadId: null },
    ],
    sentiment: { overall: "positive", score: 0.75 },
    processedAt: addMinutes(daysAgo(8, 10), 35),
    processingModel: "claude-sonnet",
  },
  mtg_005: {
    meetingId: "mtg_005",
    transcriptSource: "gemini",
    rawTranscript: null,
    summary: {
      oneLiner:
        "Distribution terms largely agreed — royalty split remains open",
      bullets: [
        "Territory: worldwide digital distribution confirmed",
        "Term length: 3 years with annual opt-out clause",
        "Royalty split: Summit proposed 70/30, Jack countered with 75/25",
        "Marketing commitment: minimum $100K annual co-marketing spend",
      ],
      keyDecisions: [
        "Worldwide digital distribution confirmed",
        "3-year term with annual opt-out",
      ],
    },
    actionItems: [
      {
        description: "Draft royalty split comparison memo",
        assigneeName: "Ana Chen",
        assigneeId: "mem_ana",
        suggestedDue: daysAgo(-8),
        taskId: "t_ai_004",
        urgency: "high",
        context: "Ana to prepare comparison of 70/30 vs 75/25 impact analysis.",
      },
      {
        description: "Review co-marketing spend commitment with finance",
        assigneeName: "Sarah Kim",
        assigneeId: "mem_sarah",
        suggestedDue: daysAgo(-6),
        taskId: "t_ai_005",
        urgency: "medium",
        context: "Sarah to confirm finance approval for $100K commitment.",
      },
    ],
    topics: [
      {
        name: "distribution agreement",
        confidence: 0.97,
        threadId: "thr_004",
      },
      { name: "royalty negotiation", confidence: 0.89, threadId: null },
    ],
    sentiment: { overall: "neutral", score: 0.55 },
    processedAt: addMinutes(daysAgo(12, 15), 58),
    processingModel: "claude-sonnet",
  },
  mtg_006: {
    meetingId: "mtg_006",
    transcriptSource: "gemini",
    rawTranscript: null,
    summary: {
      oneLiner: "Initial partnership kick-off — mutual interest confirmed",
      bullets: [
        "Nova Entertainment interested in Airlock for contract management",
        "Key pain points: manual contract tracking, missed renewals",
        "Jack introduced the Nova catalog: 2,400 active contracts",
        "Agreed to start with a pilot vault for top-10 contracts",
      ],
      keyDecisions: [
        "Pilot program approved for top-10 contracts",
        "Billy to set up pilot vault by end of month",
      ],
    },
    actionItems: [
      {
        description: "Create pilot vault for Nova top-10 contracts",
        assigneeName: "Billy Chen",
        assigneeId: "mem_billy",
        suggestedDue: daysAgo(-15),
        taskId: "t_ai_006",
        urgency: "medium",
        context: "Billy to set up the vault and import initial contract data.",
      },
    ],
    topics: [
      { name: "partnership kickoff", confidence: 0.93, threadId: null },
      { name: "contract management", confidence: 0.85, threadId: null },
    ],
    sentiment: { overall: "positive", score: 0.88 },
    processedAt: addMinutes(daysAgo(20, 11), 48),
    processingModel: "claude-sonnet",
  },
};

/* ── Mock transcript entries ──────────────────────────── */

export const MOCK_TRANSCRIPTS: Record<string, TranscriptEntry[]> = {
  mtg_003: [
    {
      speaker: "Billy Chen",
      timestamp: "00:00:12",
      content:
        "Thanks for joining, Dave. Let's run through the Q2 marketing plan.",
    },
    {
      speaker: "Dave Ruiz",
      timestamp: "00:00:25",
      content:
        "Sure. I've been working on the timeline. I think April 15 is realistic for the launch.",
    },
    {
      speaker: "Billy Chen",
      timestamp: "00:01:03",
      content: "April 15 works. What's the budget looking like?",
    },
    {
      speaker: "Dave Ruiz",
      timestamp: "00:01:18",
      content:
        "We can pull $50K from the marketing reserve. That covers creative, paid media, and the launch event.",
    },
    {
      speaker: "Billy Chen",
      timestamp: "00:02:05",
      content:
        "Let me check with the CFO on that drawdown. Can you get me the rollout plan document by end of week?",
      isActionItem: true,
    },
    {
      speaker: "Dave Ruiz",
      timestamp: "00:02:22",
      content:
        "Absolutely. I'll also coordinate with the design team on creative assets.",
      isActionItem: true,
    },
    {
      speaker: "Billy Chen",
      timestamp: "00:03:45",
      content:
        "Perfect. Let's schedule a follow-up for March 15 to review progress.",
    },
    {
      speaker: "Dave Ruiz",
      timestamp: "00:04:02",
      content: "Sounds good. I'll send the calendar invite.",
    },
    {
      speaker: "Billy Chen",
      timestamp: "00:04:30",
      content:
        "One more thing — I want to make sure we align the campaign messaging with Nova's brand guidelines.",
    },
    {
      speaker: "Dave Ruiz",
      timestamp: "00:05:15",
      content:
        "I'll loop in their marketing team. Jack mentioned they have updated brand assets we should use.",
    },
    {
      speaker: "Billy Chen",
      timestamp: "00:05:45",
      content: "Great. I think we're in good shape. Let's wrap up.",
    },
    {
      speaker: "Dave Ruiz",
      timestamp: "00:06:00",
      content: "Agreed. Talk soon.",
    },
  ],
};

/* ── Mock prep brief ──────────────────────────────────── */

export const MOCK_PREP_BRIEFS: Record<string, PrepBrief> = {
  mtg_001: {
    meetingId: "mtg_001",
    generatedAt: hoursFromNow(-1),
    attendeeProfiles: [
      {
        contactId: "ct_jack",
        name: "Jack Burke",
        company: "Nova Entertainment",
        role: "VP Business Development",
        lastInteraction: daysAgo(4),
        interactionCount: 12,
        sentimentTrend: "positive",
        openActionItems: [
          {
            description: "Send APAC market research data",
            due: daysAgo(-3),
            status: "overdue",
          },
        ],
      },
    ],
    relatedMeetings: [
      {
        meetingId: "mtg_003",
        date: daysAgo(4, 14),
        title: "Nova Entertainment — Marketing Review",
        participants: ["Billy Chen", "Dave Ruiz"],
        summary: "Agreed on Q2 timeline. Dave raised budget concerns.",
        unresolvedItems: ["Budget approval pending CFO sign-off"],
      },
      {
        meetingId: "mtg_004",
        date: daysAgo(8, 10),
        title: "Nova — Contract Renewal Check-in",
        participants: ["Billy Chen", "Jack Burke"],
        summary: "APAC territory expansion discussed. Revised terms pending.",
        unresolvedItems: ["APAC territory terms not finalized"],
      },
    ],
    activeVaults: [
      {
        vaultId: "vault_nova",
        name: "Nova Entertainment",
        module: "CRM",
        chamber: "Build",
        health: 78,
        recentActivity: "Patch submitted 2 days ago, awaiting review",
      },
    ],
    openTasks: [
      {
        taskId: "t_ai_001",
        title: "Send Q2 rollout plan document",
        assignee: "Dave Ruiz",
        due: hoursFromNow(72),
        status: "in_progress",
      },
      {
        taskId: "t_ai_003",
        title: "Prepare revised contract terms with APAC territory",
        assignee: "Billy Chen",
        due: daysAgo(-5),
        status: "overdue",
      },
    ],
    topicThreads: [
      {
        topic: "marketing initiative",
        firstMentioned: daysAgo(20),
        meetingCount: 3,
        keyDecisions: ["Q2 timeline agreed", "Budget pending CFO"],
        relatedVaultNames: ["Nova Entertainment"],
      },
      {
        topic: "contract renewal",
        firstMentioned: daysAgo(30),
        meetingCount: 2,
        keyDecisions: [
          "APAC expansion approved in principle",
          "90-day renewal window identified",
        ],
        relatedVaultNames: ["Nova Entertainment"],
      },
    ],
  },
};

/* ── Mock conversation threads ────────────────────────── */

export const MOCK_THREADS: ConversationThread[] = [
  {
    id: "thr_001",
    workspaceId: "ws_1",
    topic: "marketing initiative",
    firstMentioned: daysAgo(20),
    lastMentioned: daysAgo(4),
    mentionCount: 4,
    status: "active",
    linkedMeetingIds: ["mtg_003", "mtg_006"],
    linkedVaultNames: ["Nova Entertainment"],
  },
  {
    id: "thr_002",
    workspaceId: "ws_1",
    topic: "Q2 planning",
    firstMentioned: daysAgo(15),
    lastMentioned: daysAgo(4),
    mentionCount: 3,
    status: "active",
    linkedMeetingIds: ["mtg_003"],
    linkedVaultNames: ["Nova Entertainment"],
  },
  {
    id: "thr_003",
    workspaceId: "ws_1",
    topic: "contract renewal",
    firstMentioned: daysAgo(30),
    lastMentioned: daysAgo(8),
    mentionCount: 2,
    status: "active",
    linkedMeetingIds: ["mtg_004"],
    linkedVaultNames: ["Nova Entertainment"],
  },
  {
    id: "thr_004",
    workspaceId: "ws_1",
    topic: "distribution agreement",
    firstMentioned: daysAgo(14),
    lastMentioned: daysAgo(12),
    mentionCount: 1,
    status: "active",
    linkedMeetingIds: ["mtg_005"],
    linkedVaultNames: ["Summit Publishing"],
  },
];
