import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { Conversation, Message } from "@/lib/mock-messenger";
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_REPLIES,
} from "@/lib/mock-messenger";

interface MessengerState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  isLoading: boolean;

  isDrawerOpen: boolean;
  activeConversationId: string | null;
  scope: "module" | "global";
  searchQuery: string;
  typingUsers: Record<string, string[]>;

  fetchMessenger: () => Promise<void>;
  toggleDrawer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openConversation: (id: string) => void;
  backToList: () => void;
  setScope: (scope: "module" | "global") => void;
  setSearchQuery: (query: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string) => void;

  filteredConversations: (activeModule: string) => Conversation[];
  totalUnread: () => number;
}

let replyTimeout: ReturnType<typeof setTimeout> | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

export const useMessengerStore = create<MessengerState>((set, get) => ({
  conversations: [],
  messages: {},
  isLoading: false,

  isDrawerOpen: false,
  activeConversationId: null,
  scope: "module",
  searchQuery: "",
  typingUsers: {},

  fetchMessenger: async () => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{
        conversations: Conversation[];
        messages: Record<string, Message[]>;
      }>("/api/v1/messenger");
      set({
        conversations: data.conversations,
        messages: data.messages,
        isLoading: false,
      });
    } catch {
      set({
        conversations: MOCK_CONVERSATIONS,
        messages: MOCK_MESSAGES,
        isLoading: false,
      });
    }
  },

  toggleDrawer: () =>
    set((s) => ({
      isDrawerOpen: !s.isDrawerOpen,
      activeConversationId: s.isDrawerOpen ? null : s.activeConversationId,
    })),

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false, activeConversationId: null }),

  openConversation: (id) => {
    set({ activeConversationId: id });
    get().markAsRead(id);
  },

  backToList: () => set({ activeConversationId: null }),

  setScope: (scope) => set({ scope }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  markAsRead: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    })),

  sendMessage: (conversationId, content) => {
    const now = new Date().toISOString();
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      authorId: "user_self",
      authorName: "You",
      content,
      messageType: "text",
      createdAt: now,
    };

    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), newMsg],
      },
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: {
                authorName: "You",
                content,
                timestamp: now,
              },
            }
          : c,
      ),
    }));

    // Simulate typing + reply
    const reply = MOCK_REPLIES[conversationId];
    if (reply) {
      if (replyTimeout) clearTimeout(replyTimeout);
      if (typingTimeout) clearTimeout(typingTimeout);

      typingTimeout = setTimeout(() => {
        set((s) => ({
          typingUsers: {
            ...s.typingUsers,
            [conversationId]: [reply.authorName],
          },
        }));
      }, 1000);

      replyTimeout = setTimeout(() => {
        const replyMsg: Message = {
          id: `msg_${Date.now()}`,
          conversationId,
          authorId: "user_reply",
          authorName: reply.authorName,
          content: reply.content,
          messageType: "text",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: [...(s.messages[conversationId] || []), replyMsg],
          },
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: {
                    authorName: reply.authorName,
                    content: reply.content,
                    timestamp: replyMsg.createdAt,
                  },
                }
              : c,
          ),
          typingUsers: {
            ...s.typingUsers,
            [conversationId]: [],
          },
        }));
      }, 3000);
    }
  },

  filteredConversations: (activeModule) => {
    const { conversations, scope, searchQuery } = get();
    let filtered = conversations;

    if (scope === "module") {
      filtered = filtered.filter(
        (c) =>
          c.type === "dm" || c.moduleId === activeModule || c.type === "team",
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        const name =
          c.name ||
          c.participants.find((p) => p.userId !== "user_self")?.name ||
          "";
        return name.toLowerCase().includes(q);
      });
    }

    return filtered.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.createdAt;
      const bTime = b.lastMessage?.timestamp || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  },

  totalUnread: () => {
    const { conversations } = get();
    return conversations
      .filter((c) => !c.muted)
      .reduce((sum, c) => sum + c.unreadCount, 0);
  },
}));
