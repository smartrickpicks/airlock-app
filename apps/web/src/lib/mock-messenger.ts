// ─── Types ───────────────────────────────────────────────────────────

import type { LinkPreviewData } from "@/components/molecules/LinkPreview";
export type { LinkPreviewData };

export type ConversationType =
  | "vault_thread"
  | "dm"
  | "team"
  | "module"
  | "otto";
export type MessageType = "text" | "file" | "system" | "gif";
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
  topic?: string;
  contextType?: string;
  contextId?: string;
  contextName?: string;
  personaMode?: string;
  archived?: boolean;
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

export interface Embed {
  type:
    | "sovereign_balance"
    | "node_preview"
    | "gate_alert"
    | "roster_card"
    | "playbook_diff"
    | "code_block";
  data: Record<string, unknown>;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userReacted: boolean;
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
  fileUrl?: string;
  fileMimeType?: string;
  createdAt: string;
  gifUrl?: string;
  gifProvider?: string;
  gifWidth?: number;
  gifHeight?: number;
  embeds?: Embed[];
  personaMode?: string;
  readAt?: string;
  editedAt?: string;
  reactions?: ReactionSummary[];
  replyToId?: string;
  replyPreview?: { authorName: string; content: string };
  pinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  linkPreviews?: LinkPreviewData[];
  bookmarked?: boolean;
  bookmarkedAt?: string;
  forwardedFrom?: {
    messageId: string;
    senderName: string;
    conversationName: string;
  };
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
  otto: { label: "Otto", icon: "Bot" },
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

const LUNA: ConversationParticipant = {
  userId: "user_001",
  name: "Luna Torres",
  online: true,
};
const KAI: ConversationParticipant = {
  userId: "user_002",
  name: "Kai Nakamura",
  online: false,
};
const MIA: ConversationParticipant = {
  userId: "user_003",
  name: "Mia Okafor",
  online: true,
};
const CURRENT_USER: ConversationParticipant = {
  userId: "user_self",
  name: "You",
  online: true,
};
const DEX: ConversationParticipant = {
  userId: "user_004",
  name: "Dex Rollins",
  online: false,
};

// ─── Mock Conversations ──────────────────────────────────────────────

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_001",
    type: "vault_thread",
    name: "Barclay — Direct Distribution Deal",
    moduleId: "contracts",
    vaultId: "vault_001",
    chamber: "discover",
    participants: [LUNA, KAI, CURRENT_USER],
    lastMessage: {
      authorName: "Luna Torres",
      content:
        "Empire just sent the updated term sheet — 80/20 split, 2-year lock",
      timestamp: "2026-03-10T16:45:00Z",
    },
    unreadCount: 3,
    muted: false,
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "conv_002",
    type: "vault_thread",
    name: "Jay Solis — Nettwerk Sync",
    moduleId: "contracts",
    vaultId: "vault_003",
    chamber: "build",
    participants: [KAI, DEX, CURRENT_USER],
    lastMessage: {
      authorName: "Kai Nakamura",
      content:
        "Extraction pulled 18 fields. Netflix placement fee is $18K non-exclusive.",
      timestamp: "2026-03-09T14:20:00Z",
    },
    unreadCount: 1,
    muted: false,
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "conv_003",
    type: "vault_thread",
    name: "Nova Lux — Empire Worldwide",
    moduleId: "contracts",
    vaultId: "vault_006",
    chamber: "ship",
    participants: [MIA, LUNA, CURRENT_USER],
    lastMessage: {
      authorName: "Mia Okafor",
      content: "Approved. Glass Frequencies is shipping. Let's go.",
      timestamp: "2026-03-08T11:00:00Z",
    },
    unreadCount: 0,
    muted: false,
    createdAt: "2026-01-20T14:00:00Z",
  },
  {
    id: "conv_004",
    type: "dm",
    name: null,
    moduleId: null,
    vaultId: null,
    chamber: null,
    participants: [LUNA, CURRENT_USER],
    lastMessage: {
      authorName: "Luna Torres",
      content:
        "Boiler Room just emailed — they want Nova Lux for a Berlin set. Should I triage it?",
      timestamp: "2026-03-11T10:30:00Z",
    },
    unreadCount: 2,
    muted: false,
    createdAt: "2026-01-10T09:00:00Z",
  },
  {
    id: "conv_005",
    type: "dm",
    name: null,
    moduleId: null,
    vaultId: null,
    chamber: null,
    participants: [DEX, CURRENT_USER],
    lastMessage: {
      authorName: "Dex Rollins",
      content:
        "Midnight Concrete masters are done. Jay is hyped. Sending the files now.",
      timestamp: "2026-03-10T18:00:00Z",
    },
    unreadCount: 1,
    muted: false,
    createdAt: "2026-01-18T11:00:00Z",
  },
  {
    id: "conv_006",
    type: "team",
    name: "#artist-relations",
    moduleId: null,
    vaultId: null,
    chamber: null,
    participants: [LUNA, MIA, DEX, CURRENT_USER],
    lastMessage: {
      authorName: "Luna Torres",
      content:
        "Barclay wants full ownership post-Dirtybird. He's serious about the direct deal.",
      timestamp: "2026-03-10T13:00:00Z",
    },
    unreadCount: 1,
    muted: false,
    createdAt: "2026-01-05T09:00:00Z",
    topic: "Artist management and career development",
  },
  {
    id: "conv_007",
    type: "team",
    name: "#release-planning",
    moduleId: null,
    vaultId: null,
    chamber: null,
    participants: [LUNA, KAI, DEX, MIA, CURRENT_USER],
    lastMessage: {
      authorName: "Dex Rollins",
      content:
        "Urban Fauna EP masters are locked. Metadata sheet is in the vault.",
      timestamp: "2026-03-09T17:00:00Z",
    },
    unreadCount: 0,
    muted: false,
    createdAt: "2026-01-08T09:00:00Z",
    topic: "Release scheduling, distribution, and launch coordination",
  },
  {
    id: "conv_008",
    type: "module",
    name: "#contracts-general",
    moduleId: "contracts",
    vaultId: null,
    chamber: null,
    participants: [LUNA, KAI, MIA, DEX, CURRENT_USER],
    lastMessage: {
      authorName: "System",
      content: "3 vaults advanced this week",
      timestamp: "2026-03-10T08:00:00Z",
    },
    unreadCount: 0,
    muted: false,
    createdAt: "2026-01-01T09:00:00Z",
  },
  {
    id: "conv_009",
    type: "module",
    name: "#crm-general",
    moduleId: "crm",
    vaultId: null,
    chamber: null,
    participants: [LUNA, MIA, CURRENT_USER],
    lastMessage: {
      authorName: "Mia Okafor",
      content:
        "Redbull partnership is heating up — they want The Portals for the Sound Stage",
      timestamp: "2026-03-09T12:00:00Z",
    },
    unreadCount: 0,
    muted: false,
    createdAt: "2026-01-01T09:00:00Z",
  },
  {
    id: "conv_010",
    type: "module",
    name: "#tasks-general",
    moduleId: "tasks",
    vaultId: null,
    chamber: null,
    participants: [LUNA, KAI, CURRENT_USER],
    lastMessage: {
      authorName: "Luna Torres",
      content:
        "SLA warning on the Boiler Room license — we need to respond today",
      timestamp: "2026-03-11T09:00:00Z",
    },
    unreadCount: 0,
    muted: true,
    createdAt: "2026-01-01T09:00:00Z",
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
      content: "Vault thread created for Barclay — Direct Distribution Deal",
      messageType: "system",
      createdAt: "2026-01-15T09:00:00Z",
    },
    {
      id: "msg_002",
      conversationId: "conv_001",
      authorId: "user_self",
      authorName: "You",
      content:
        "Luna found this lead — Barclay wants to own his masters post-Dirtybird. Let's see what Empire offers.",
      messageType: "text",
      createdAt: "2026-01-15T09:15:00Z",
      reactions: [{ emoji: "👀", count: 2, userReacted: false }],
    },
    {
      id: "msg_003",
      conversationId: "conv_001",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "Empire's A&R director is interested. They're sending a term sheet.",
      messageType: "text",
      createdAt: "2026-02-10T11:00:00Z",
      pinned: true,
      pinnedBy: "Luna Torres",
      pinnedAt: "2026-02-10T11:30:00Z",
    },
    {
      id: "msg_004",
      conversationId: "conv_001",
      authorId: "user_002",
      authorName: "Kai Nakamura",
      content: "I'll run the term sheet through extraction once it lands.",
      messageType: "text",
      createdAt: "2026-03-08T10:00:00Z",
    },
    {
      id: "msg_005",
      conversationId: "conv_001",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "Empire just sent the updated term sheet — 80/20 split, 2-year lock",
      messageType: "text",
      createdAt: "2026-03-10T16:30:00Z",
    },
    {
      id: "msg_006",
      conversationId: "conv_001",
      authorId: "user_self",
      authorName: "You",
      content:
        "80/20 is below market for someone with Barclay's catalog. Push for 85/15.",
      messageType: "text",
      createdAt: "2026-03-10T16:45:00Z",
      reactions: [
        { emoji: "🔥", count: 3, userReacted: false },
        { emoji: "💯", count: 1, userReacted: true },
      ],
    },
  ],
  conv_002: [
    {
      id: "msg_020",
      conversationId: "conv_002",
      authorId: null,
      authorName: "System",
      content: "Vault thread created for Jay Solis — Nettwerk Sync License",
      messageType: "system",
      createdAt: "2026-02-01T10:00:00Z",
    },
    {
      id: "msg_021",
      conversationId: "conv_002",
      authorId: "user_self",
      authorName: "You",
      content:
        "Nettwerk wants Jay for a Netflix series placement. This could be huge.",
      messageType: "text",
      createdAt: "2026-02-01T10:15:00Z",
    },
    {
      id: "msg_022",
      conversationId: "conv_002",
      authorId: "user_002",
      authorName: "Kai Nakamura",
      content:
        "Extraction pulled 18 fields. Netflix placement fee is $18K non-exclusive.",
      messageType: "text",
      createdAt: "2026-03-09T13:00:00Z",
      pinned: true,
      pinnedBy: "Kai Nakamura",
      pinnedAt: "2026-03-09T13:05:00Z",
      reactions: [{ emoji: "✅", count: 2, userReacted: true }],
      embeds: [
        {
          type: "gate_alert",
          data: {
            vaultName: "Jay Solis — Nettwerk Sync License",
            gate: "gate_preflight",
            status: "passed",
            fieldsExtracted: 18,
            confidence: 0.94,
          },
        },
      ],
    },
    {
      id: "msg_023",
      conversationId: "conv_002",
      authorId: "user_004",
      authorName: "Dex Rollins",
      content:
        "That's solid for a series placement. Is it the main title or background?",
      messageType: "text",
      createdAt: "2026-03-09T13:30:00Z",
    },
    {
      id: "msg_024",
      conversationId: "conv_002",
      authorId: "user_002",
      authorName: "Kai Nakamura",
      content:
        "Background — but 3 episodes guaranteed. Territory is worldwide.",
      messageType: "text",
      createdAt: "2026-03-09T14:20:00Z",
    },
  ],
  conv_003: [
    {
      id: "msg_030",
      conversationId: "conv_003",
      authorId: null,
      authorName: "System",
      content:
        "Vault thread created for Nova Lux — Empire Worldwide Distribution",
      messageType: "system",
      createdAt: "2026-01-20T14:00:00Z",
    },
    {
      id: "msg_031",
      conversationId: "conv_003",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "All extraction fields verified. Royalty split is 70/30. Territory worldwide.",
      messageType: "text",
      createdAt: "2026-03-06T10:00:00Z",
    },
    {
      id: "msg_032",
      conversationId: "conv_003",
      authorId: "user_002",
      authorName: "Kai Nakamura",
      content: "Legal review complete. No red flags. Ready for Mia's sign-off.",
      messageType: "text",
      createdAt: "2026-03-07T15:00:00Z",
    },
    {
      id: "msg_033",
      conversationId: "conv_003",
      authorId: "user_003",
      authorName: "Mia Okafor",
      content: "Approved. Glass Frequencies is shipping. Let's go.",
      messageType: "text",
      createdAt: "2026-03-08T11:00:00Z",
      reactions: [
        { emoji: "🎉", count: 4, userReacted: true },
        { emoji: "🚀", count: 2, userReacted: false },
      ],
    },
  ],
  conv_004: [
    {
      id: "msg_040",
      conversationId: "conv_004",
      authorId: "user_001",
      authorName: "Luna Torres",
      content: "Hey — Boiler Room just reached out about Nova Lux",
      messageType: "text",
      createdAt: "2026-03-11T09:50:00Z",
    },
    {
      id: "msg_041",
      conversationId: "conv_004",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "They want a live set recording for their Berlin series. Performance license needed.",
      messageType: "text",
      createdAt: "2026-03-11T09:51:00Z",
    },
    {
      id: "msg_042",
      conversationId: "conv_004",
      authorId: "user_self",
      authorName: "You",
      content: "That's amazing. Triage it — I'll loop in Kai for the license.",
      messageType: "text",
      createdAt: "2026-03-11T10:00:00Z",
    },
    {
      id: "msg_043",
      conversationId: "conv_004",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "On it. Also — they asked about Barclay too but I think we should focus on Nova Lux first.",
      messageType: "text",
      createdAt: "2026-03-11T10:15:00Z",
    },
    {
      id: "msg_044",
      conversationId: "conv_004",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "Boiler Room just emailed — they want Nova Lux for a Berlin set. Should I triage it?",
      messageType: "text",
      createdAt: "2026-03-11T10:30:00Z",
    },
  ],
  conv_005: [
    {
      id: "msg_050",
      conversationId: "conv_005",
      authorId: "user_004",
      authorName: "Dex Rollins",
      content: "yo the Midnight Concrete sessions are wrapping up",
      messageType: "text",
      createdAt: "2026-03-09T18:00:00Z",
    },
    {
      id: "msg_051",
      conversationId: "conv_005",
      authorId: "user_004",
      authorName: "Dex Rollins",
      content: "Jay is in the zone. These tracks are something else.",
      messageType: "text",
      createdAt: "2026-03-09T18:02:00Z",
    },
    {
      id: "msg_052",
      conversationId: "conv_005",
      authorId: "user_self",
      authorName: "You",
      content: "Can't wait to hear it. When are masters due?",
      messageType: "text",
      createdAt: "2026-03-09T18:10:00Z",
    },
    {
      id: "msg_053",
      conversationId: "conv_005",
      authorId: "user_004",
      authorName: "Dex Rollins",
      content: "3 weeks. Sending you a preview now.",
      messageType: "text",
      createdAt: "2026-03-09T18:15:00Z",
    },
    {
      id: "msg_054",
      conversationId: "conv_005",
      authorId: "user_004",
      authorName: "Dex Rollins",
      content: "midnight-concrete-preview-mix.wav",
      messageType: "file",
      fileName: "midnight-concrete-preview-mix.wav",
      fileSize: 48000000,
      fileMimeType: "audio/wav",
      createdAt: "2026-03-09T18:16:00Z",
    },
    {
      id: "msg_055",
      conversationId: "conv_005",
      authorId: "user_004",
      authorName: "Dex Rollins",
      content:
        "Midnight Concrete masters are done. Jay is hyped. Sending the files now.",
      messageType: "text",
      createdAt: "2026-03-10T18:00:00Z",
    },
  ],
  conv_006: [
    {
      id: "msg_060",
      conversationId: "conv_006",
      authorId: "user_003",
      authorName: "Mia Okafor",
      content:
        "Quick update — I talked to Barclay yesterday. He's done with the old label structure.",
      messageType: "text",
      createdAt: "2026-03-09T11:00:00Z",
    },
    {
      id: "msg_061",
      conversationId: "conv_006",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "He wants full ownership post-Dirtybird. The direct deal through Empire is his priority.",
      messageType: "text",
      createdAt: "2026-03-09T11:10:00Z",
    },
    {
      id: "msg_062",
      conversationId: "conv_006",
      authorId: "user_004",
      authorName: "Dex Rollins",
      content: "Makes sense. He built that whole sound. Should own it.",
      messageType: "text",
      createdAt: "2026-03-10T12:00:00Z",
    },
    {
      id: "msg_063",
      conversationId: "conv_006",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "Barclay wants full ownership post-Dirtybird. He's serious about the direct deal.",
      messageType: "text",
      createdAt: "2026-03-10T13:00:00Z",
    },
  ],
  conv_007: [
    {
      id: "msg_070",
      conversationId: "conv_007",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "Two releases coming up: Urban Fauna EP (Barclay) and Glass Frequencies (Nova Lux)",
      messageType: "text",
      createdAt: "2026-03-08T09:00:00Z",
    },
    {
      id: "msg_071",
      conversationId: "conv_007",
      authorId: "user_002",
      authorName: "Kai Nakamura",
      content:
        "Empire distro is locked for Nova Lux. AWAL is handling Barclay's release.",
      messageType: "text",
      createdAt: "2026-03-08T09:30:00Z",
    },
    {
      id: "msg_072",
      conversationId: "conv_007",
      authorId: "user_004",
      authorName: "Dex Rollins",
      content:
        "Urban Fauna EP masters are locked. Metadata sheet is in the vault.",
      messageType: "text",
      createdAt: "2026-03-09T17:00:00Z",
    },
    {
      id: "msg_073",
      conversationId: "conv_007",
      authorId: "user_003",
      authorName: "Mia Okafor",
      content:
        "Let's stagger the drops — Urban Fauna first, then Glass Frequencies 2 weeks later.",
      messageType: "text",
      createdAt: "2026-03-09T17:15:00Z",
    },
  ],
  conv_008: [
    {
      id: "msg_080",
      conversationId: "conv_008",
      authorId: null,
      authorName: "System",
      content: "3 vaults advanced this week",
      messageType: "system",
      createdAt: "2026-03-10T08:00:00Z",
    },
  ],
  conv_009: [
    {
      id: "msg_090",
      conversationId: "conv_009",
      authorId: "user_003",
      authorName: "Mia Okafor",
      content:
        "Redbull partnership is heating up — they want The Portals for the Sound Stage",
      messageType: "text",
      createdAt: "2026-03-09T12:00:00Z",
    },
  ],
  conv_010: [
    {
      id: "msg_100",
      conversationId: "conv_010",
      authorId: "user_001",
      authorName: "Luna Torres",
      content:
        "SLA warning on the Boiler Room license — we need to respond today",
      messageType: "text",
      createdAt: "2026-03-11T09:00:00Z",
    },
  ],
};

// ─── Mock Reply Responses ────────────────────────────────────────────

export const MOCK_REPLIES: Record<
  string,
  { authorName: string; content: string }
> = {
  conv_001: {
    authorName: "Luna Torres",
    content: "I'll push back on the split. 85/15 or we walk.",
  },
  conv_002: {
    authorName: "Kai Nakamura",
    content: "Confirmed — background placement, 3 episodes.",
  },
  conv_003: {
    authorName: "Mia Okafor",
    content: "Congratulations team. This is a big one.",
  },
  conv_004: {
    authorName: "Luna Torres",
    content: "Triaging now. I'll create the vault.",
  },
  conv_005: {
    authorName: "Dex Rollins",
    content: "Sending the final masters over now.",
  },
  conv_006: {
    authorName: "Luna Torres",
    content: "Setting up the Empire call for next week.",
  },
};

// ─── User Statuses ───────────────────────────────────────────────────

export interface UserStatus {
  userId: string;
  emoji: string;
  text: string;
  expiresAt?: string; // ISO timestamp
}

export const MOCK_USER_STATUSES: Record<string, UserStatus> = {
  user_001: {
    userId: "user_001",
    emoji: "🎧",
    text: "Scouting new artists — in discovery mode",
  },
  user_002: {
    userId: "user_002",
    emoji: "📋",
    text: "Reviewing Nettwerk sync terms",
  },
  user_004: {
    userId: "user_004",
    emoji: "🎹",
    text: "In the studio — mixing Midnight Concrete",
  },
};

// ─── URL Utilities ───────────────────────────────────────────────────

export function extractUrls(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/g;
  return content.match(urlRegex) || [];
}
