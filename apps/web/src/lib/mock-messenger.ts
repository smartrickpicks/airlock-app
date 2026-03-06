// ─── Types ───────────────────────────────────────────────────────────

export type ConversationType = "vault_thread" | "dm" | "team" | "module";
export type MessageType = "text" | "file" | "system";
export type ChamberName = "discover" | "build" | "review" | "ship";

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  moduleId: string | null;
  vaultId: string | null;
  chamber: ChamberName | null;
  participants: ConversationParticipant[];
  lastMessage: MessagePreview | null;
  unreadCount: number;
  muted: boolean;
  createdAt: string;
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  avatarUrl?: string;
  online: boolean;
}

export interface MessagePreview {
  authorName: string;
  content: string;
  timestamp: string;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string | null;
  authorName: string;
  authorAvatar?: string;
  content: string;
  messageType: MessageType;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

// ─── Config ──────────────────────────────────────────────────────────

export const CONVERSATION_TYPE_CONFIG: Record<
  ConversationType,
  { label: string; icon: string }
> = {
  vault_thread: { label: "Vault Thread", icon: "Circle" },
  dm: { label: "Direct Message", icon: "User" },
  team: { label: "Team", icon: "Users" },
  module: { label: "Module", icon: "Hash" },
};

export const CHAMBER_DOT_CONFIG: Record<
  ChamberName,
  { color: string; label: string }
> = {
  discover: { color: "bg-[var(--chamber-discover)]", label: "Discover" },
  build: { color: "bg-[var(--chamber-build)]", label: "Build" },
  review: { color: "bg-[var(--chamber-review)]", label: "Review" },
  ship: { color: "bg-[var(--chamber-ship)]", label: "Ship" },
};

// ─── Mock Participants ───────────────────────────────────────────────

const ANA: ConversationParticipant = {
  userId: "user_001",
  name: "Ana Chen",
  online: true,
};
const MARCO: ConversationParticipant = {
  userId: "user_002",
  name: "Marco Li",
  online: false,
};
const SARAH: ConversationParticipant = {
  userId: "user_003",
  name: "Sarah Owner",
  online: true,
};
const CURRENT_USER: ConversationParticipant = {
  userId: "user_self",
  name: "You",
  online: true,
};
const TOM: ConversationParticipant = {
  userId: "user_004",
  name: "Tom Gatekeeper",
  online: false,
};

// ─── Mock Conversations ──────────────────────────────────────────────

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_001",
    type: "vault_thread",
    name: "Henderson MSA",
    moduleId: "contracts",
    vaultId: "vault_henderson",
    chamber: "review",
    participants: [ANA, MARCO, CURRENT_USER],
    lastMessage: {
      authorName: "Ana Chen",
      content: "Field extraction looks good, 5 fields need review",
      timestamp: "2026-03-05T14:28:00Z",
    },
    unreadCount: 3,
    muted: false,
    createdAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "conv_002",
    type: "vault_thread",
    name: "Acme Distribution Agreement",
    moduleId: "contracts",
    vaultId: "vault_acme",
    chamber: "build",
    participants: [MARCO, CURRENT_USER],
    lastMessage: {
      authorName: "Marco Li",
      content: "Updated the territory clause",
      timestamp: "2026-03-05T11:15:00Z",
    },
    unreadCount: 0,
    muted: false,
    createdAt: "2026-02-28T10:00:00Z",
  },
  {
    id: "conv_003",
    type: "vault_thread",
    name: "Summit Publishing License",
    moduleId: "contracts",
    vaultId: "vault_summit",
    chamber: "ship",
    participants: [SARAH, ANA, CURRENT_USER],
    lastMessage: {
      authorName: "Sarah Owner",
      content: "Approved for ship. Great work team!",
      timestamp: "2026-03-05T09:30:00Z",
    },
    unreadCount: 1,
    muted: false,
    createdAt: "2026-02-20T14:00:00Z",
  },
  {
    id: "conv_004",
    type: "dm",
    name: null,
    moduleId: null,
    vaultId: null,
    chamber: null,
    participants: [ANA, CURRENT_USER],
    lastMessage: {
      authorName: "Ana Chen",
      content: "Can you check the SLA on Henderson?",
      timestamp: "2026-03-05T13:45:00Z",
    },
    unreadCount: 0,
    muted: false,
    createdAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "conv_005",
    type: "dm",
    name: null,
    moduleId: null,
    vaultId: null,
    chamber: null,
    participants: [MARCO, CURRENT_USER],
    lastMessage: {
      authorName: "Marco Li",
      content: "Sent you the updated extraction report",
      timestamp: "2026-03-04T16:20:00Z",
    },
    unreadCount: 2,
    muted: false,
    createdAt: "2026-02-18T11:00:00Z",
  },
  {
    id: "conv_006",
    type: "team",
    name: "#design-reviews",
    moduleId: null,
    vaultId: null,
    chamber: null,
    participants: [ANA, MARCO, SARAH, TOM, CURRENT_USER],
    lastMessage: {
      authorName: "Marco Li",
      content: "Pushed the updated wireframes for the new gate flow",
      timestamp: "2026-03-05T10:00:00Z",
    },
    unreadCount: 1,
    muted: false,
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "conv_007",
    type: "team",
    name: "#onboarding",
    moduleId: null,
    vaultId: null,
    chamber: null,
    participants: [ANA, TOM, CURRENT_USER],
    lastMessage: {
      authorName: "Tom Gatekeeper",
      content: "Welcome guide is updated for the new dashboard",
      timestamp: "2026-03-03T15:30:00Z",
    },
    unreadCount: 0,
    muted: false,
    createdAt: "2026-01-10T09:00:00Z",
  },
  {
    id: "conv_008",
    type: "module",
    name: "#contracts-general",
    moduleId: "contracts",
    vaultId: null,
    chamber: null,
    participants: [ANA, MARCO, SARAH, TOM, CURRENT_USER],
    lastMessage: {
      authorName: "System",
      content: "5 new vaults created today",
      timestamp: "2026-03-05T08:00:00Z",
    },
    unreadCount: 0,
    muted: false,
    createdAt: "2025-11-01T09:00:00Z",
  },
  {
    id: "conv_009",
    type: "module",
    name: "#crm-general",
    moduleId: "crm",
    vaultId: null,
    chamber: null,
    participants: [ANA, SARAH, CURRENT_USER],
    lastMessage: {
      authorName: "Sarah Owner",
      content: "Pipeline review meeting moved to Thursday",
      timestamp: "2026-03-04T14:00:00Z",
    },
    unreadCount: 0,
    muted: false,
    createdAt: "2025-11-01T09:00:00Z",
  },
  {
    id: "conv_010",
    type: "module",
    name: "#tasks-general",
    moduleId: "tasks",
    vaultId: null,
    chamber: null,
    participants: [MARCO, TOM, CURRENT_USER],
    lastMessage: {
      authorName: "Tom Gatekeeper",
      content: "Reminder: all overdue tasks need status updates",
      timestamp: "2026-03-04T09:00:00Z",
    },
    unreadCount: 0,
    muted: true,
    createdAt: "2025-11-01T09:00:00Z",
  },
];

// ─── Mock Messages ───────────────────────────────────────────────────

export const MOCK_MESSAGES: Record<string, Message[]> = {
  conv_001: [
    {
      id: "msg_001",
      conversationId: "conv_001",
      authorId: null,
      authorName: "System",
      content: "Vault thread created for Henderson MSA",
      messageType: "system",
      createdAt: "2026-03-01T09:00:00Z",
    },
    {
      id: "msg_002",
      conversationId: "conv_001",
      authorId: "user_self",
      authorName: "You",
      content: "Starting extraction on the Henderson MSA. 85-page document.",
      messageType: "text",
      createdAt: "2026-03-01T09:15:00Z",
    },
    {
      id: "msg_003",
      conversationId: "conv_001",
      authorId: "user_001",
      authorName: "Ana Chen",
      content:
        "Extraction completed. 42 fields found, 5 need review. Confidence score is 87%.",
      messageType: "text",
      createdAt: "2026-03-02T10:30:00Z",
    },
    {
      id: "msg_004",
      conversationId: "conv_001",
      authorId: "user_002",
      authorName: "Marco Li",
      content:
        "Looking at the flagged fields now. Territory clause seems ambiguous.",
      messageType: "text",
      createdAt: "2026-03-02T10:45:00Z",
    },
    {
      id: "msg_005",
      conversationId: "conv_001",
      authorId: "user_001",
      authorName: "Ana Chen",
      content:
        "The SLA timer started at 10:30 — we have until 2:30 PM today for the review gate.",
      messageType: "text",
      createdAt: "2026-03-02T10:47:00Z",
    },
    {
      id: "msg_006",
      conversationId: "conv_001",
      authorId: "user_self",
      authorName: "You",
      content:
        "Submitted a patch for the territory field. Changed to 'Worldwide excl. Asia'.",
      messageType: "text",
      createdAt: "2026-03-04T14:00:00Z",
    },
    {
      id: "msg_007",
      conversationId: "conv_001",
      authorId: "user_001",
      authorName: "Ana Chen",
      content: "Patch approved. Moving to review gate now.",
      messageType: "text",
      createdAt: "2026-03-05T09:00:00Z",
    },
    {
      id: "msg_008",
      conversationId: "conv_001",
      authorId: "user_001",
      authorName: "Ana Chen",
      content: "Field extraction looks good, 5 fields need review",
      messageType: "text",
      createdAt: "2026-03-05T14:28:00Z",
    },
  ],
  conv_002: [
    {
      id: "msg_020",
      conversationId: "conv_002",
      authorId: null,
      authorName: "System",
      content: "Vault thread created for Acme Distribution Agreement",
      messageType: "system",
      createdAt: "2026-02-28T10:00:00Z",
    },
    {
      id: "msg_021",
      conversationId: "conv_002",
      authorId: "user_002",
      authorName: "Marco Li",
      content: "Draft is looking good. Need to finalize the royalty schedule.",
      messageType: "text",
      createdAt: "2026-03-04T09:00:00Z",
    },
    {
      id: "msg_022",
      conversationId: "conv_002",
      authorId: "user_002",
      authorName: "Marco Li",
      content: "Updated the territory clause",
      messageType: "text",
      createdAt: "2026-03-05T11:15:00Z",
    },
  ],
  conv_003: [
    {
      id: "msg_030",
      conversationId: "conv_003",
      authorId: null,
      authorName: "System",
      content: "Vault thread created for Summit Publishing License",
      messageType: "system",
      createdAt: "2026-02-20T14:00:00Z",
    },
    {
      id: "msg_031",
      conversationId: "conv_003",
      authorId: "user_003",
      authorName: "Sarah Owner",
      content: "All gates passed. Ready for final review.",
      messageType: "text",
      createdAt: "2026-03-04T16:00:00Z",
    },
    {
      id: "msg_032",
      conversationId: "conv_003",
      authorId: "user_003",
      authorName: "Sarah Owner",
      content: "Approved for ship. Great work team!",
      messageType: "text",
      createdAt: "2026-03-05T09:30:00Z",
    },
  ],
  conv_004: [
    {
      id: "msg_040",
      conversationId: "conv_004",
      authorId: "user_self",
      authorName: "You",
      content: "Hey Ana, can you take a look at the Henderson fields?",
      messageType: "text",
      createdAt: "2026-03-05T13:00:00Z",
    },
    {
      id: "msg_041",
      conversationId: "conv_004",
      authorId: "user_001",
      authorName: "Ana Chen",
      content: "Sure, I'll check it after lunch.",
      messageType: "text",
      createdAt: "2026-03-05T13:05:00Z",
    },
    {
      id: "msg_042",
      conversationId: "conv_004",
      authorId: "user_001",
      authorName: "Ana Chen",
      content: "Done! Looks like 3 fields need attention.",
      messageType: "text",
      createdAt: "2026-03-05T13:40:00Z",
    },
    {
      id: "msg_043",
      conversationId: "conv_004",
      authorId: "user_self",
      authorName: "You",
      content: "Thanks! I'll handle those now.",
      messageType: "text",
      createdAt: "2026-03-05T13:42:00Z",
    },
    {
      id: "msg_044",
      conversationId: "conv_004",
      authorId: "user_001",
      authorName: "Ana Chen",
      content: "Can you check the SLA on Henderson?",
      messageType: "text",
      createdAt: "2026-03-05T13:45:00Z",
    },
  ],
  conv_005: [
    {
      id: "msg_050",
      conversationId: "conv_005",
      authorId: "user_002",
      authorName: "Marco Li",
      content: "Hey, are you free for a quick sync on the Acme deal?",
      messageType: "text",
      createdAt: "2026-03-04T15:00:00Z",
    },
    {
      id: "msg_051",
      conversationId: "conv_005",
      authorId: "user_self",
      authorName: "You",
      content: "Sure, give me 10 minutes.",
      messageType: "text",
      createdAt: "2026-03-04T15:05:00Z",
    },
    {
      id: "msg_052",
      conversationId: "conv_005",
      authorId: "user_002",
      authorName: "Marco Li",
      content: "Sent you the updated extraction report",
      messageType: "text",
      createdAt: "2026-03-04T16:20:00Z",
    },
  ],
  conv_006: [
    {
      id: "msg_060",
      conversationId: "conv_006",
      authorId: "user_001",
      authorName: "Ana Chen",
      content: "New gate flow designs are ready for review.",
      messageType: "text",
      createdAt: "2026-03-04T14:00:00Z",
    },
    {
      id: "msg_061",
      conversationId: "conv_006",
      authorId: "user_004",
      authorName: "Tom Gatekeeper",
      content: "Looks clean. One question about the approval chain step.",
      messageType: "text",
      createdAt: "2026-03-04T15:30:00Z",
    },
    {
      id: "msg_062",
      conversationId: "conv_006",
      authorId: "user_001",
      authorName: "Ana Chen",
      content: "Good catch — updated the flow to show the two-step approval.",
      messageType: "text",
      createdAt: "2026-03-05T09:00:00Z",
    },
    {
      id: "msg_063",
      conversationId: "conv_006",
      authorId: "user_002",
      authorName: "Marco Li",
      content: "Pushed the updated wireframes for the new gate flow",
      messageType: "text",
      createdAt: "2026-03-05T10:00:00Z",
    },
  ],
  conv_007: [
    {
      id: "msg_070",
      conversationId: "conv_007",
      authorId: "user_004",
      authorName: "Tom Gatekeeper",
      content: "Welcome guide is updated for the new dashboard",
      messageType: "text",
      createdAt: "2026-03-03T15:30:00Z",
    },
  ],
  conv_008: [
    {
      id: "msg_080",
      conversationId: "conv_008",
      authorId: null,
      authorName: "System",
      content: "5 new vaults created today",
      messageType: "system",
      createdAt: "2026-03-05T08:00:00Z",
    },
  ],
  conv_009: [
    {
      id: "msg_090",
      conversationId: "conv_009",
      authorId: "user_003",
      authorName: "Sarah Owner",
      content: "Pipeline review meeting moved to Thursday",
      messageType: "text",
      createdAt: "2026-03-04T14:00:00Z",
    },
  ],
  conv_010: [
    {
      id: "msg_100",
      conversationId: "conv_010",
      authorId: "user_004",
      authorName: "Tom Gatekeeper",
      content: "Reminder: all overdue tasks need status updates",
      messageType: "text",
      createdAt: "2026-03-04T09:00:00Z",
    },
  ],
};

// ─── Mock Reply Responses ────────────────────────────────────────────

export const MOCK_REPLIES: Record<
  string,
  { authorName: string; content: string }
> = {
  conv_001: {
    authorName: "Ana Chen",
    content: "Got it, I'll take another look at those fields.",
  },
  conv_002: {
    authorName: "Marco Li",
    content: "Thanks, I'll update the clause accordingly.",
  },
  conv_003: { authorName: "Sarah Owner", content: "Excellent — shipping now." },
  conv_004: { authorName: "Ana Chen", content: "On it!" },
  conv_005: {
    authorName: "Marco Li",
    content: "Sure thing, let me know if you have questions.",
  },
  conv_006: {
    authorName: "Ana Chen",
    content: "Sounds good, I'll review the latest changes.",
  },
};
