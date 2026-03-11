import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { Conversation, Message } from "@/lib/mock-messenger";
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_REPLIES,
} from "@/lib/mock-messenger";
import { getWorkspaceMode } from "@/stores/onboarding.store";

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
  sendMessage: (
    conversationId: string,
    content: string,
    gifData?: {
      gifUrl: string;
      gifProvider: string;
      gifWidth: number;
      gifHeight: number;
    },
  ) => Promise<void>;
  markAsRead: (conversationId: string) => void;
  handleIncomingMessage: (conversationId: string, message: Message) => void;
  addReaction: (
    messageId: string,
    conversationId: string,
    emoji: string,
  ) => Promise<void>;
  removeReaction: (
    messageId: string,
    conversationId: string,
    emoji: string,
  ) => Promise<void>;

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
        next_cursor?: string;
        has_more?: boolean;
      }>("/api/chat/conversations");

      // Fetch messages for each conversation
      const messagesMap: Record<string, Message[]> = {};
      await Promise.all(
        data.conversations.map(async (conv) => {
          try {
            const msgData = await apiFetch<{
              messages: Message[];
              next_cursor?: string;
              has_more?: boolean;
            }>(`/api/chat/conversations/${conv.id}/messages?limit=50`);
            messagesMap[conv.id] = msgData.messages;
          } catch {
            messagesMap[conv.id] = [];
          }
        }),
      );

      set({
        conversations: data.conversations,
        messages: messagesMap,
        isLoading: false,
      });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ conversations: [], messages: {}, isLoading: false });
      } else {
        set({
          conversations: MOCK_CONVERSATIONS,
          messages: MOCK_MESSAGES,
          isLoading: false,
        });
      }
    }
  },

  toggleDrawer: () =>
    set((s) => ({
      isDrawerOpen: !s.isDrawerOpen,
      activeConversationId: s.isDrawerOpen ? null : s.activeConversationId,
    })),

  openDrawer: () =>
    set((state) => (state.isDrawerOpen ? state : { isDrawerOpen: true })),
  closeDrawer: () =>
    set((state) =>
      state.isDrawerOpen || state.activeConversationId
        ? { isDrawerOpen: false, activeConversationId: null }
        : state,
    ),

  openConversation: (id) => {
    set({ activeConversationId: id });
    get().markAsRead(id);
  },

  backToList: () => set({ activeConversationId: null }),

  setScope: (scope) => set({ scope }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  markAsRead: (conversationId) => {
    // Optimistic update
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    }));

    // Fire-and-forget API call
    apiFetch(`/api/v1/messenger/${conversationId}/read`, {
      method: "PATCH",
    }).catch(() => {
      // Mock fallback — already updated locally
    });
  },

  sendMessage: async (conversationId, content, gifData?) => {
    const now = new Date().toISOString();
    const messageType = gifData ? "gif" : "text";
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      authorId: "user_self",
      authorName: "You",
      content,
      messageType,
      createdAt: now,
      ...(gifData && {
        gifUrl: gifData.gifUrl,
        gifProvider: gifData.gifProvider,
        gifWidth: gifData.gifWidth,
        gifHeight: gifData.gifHeight,
      }),
    };

    // Optimistic update
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), newMsg],
      },
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: { authorName: "You", content, timestamp: now },
            }
          : c,
      ),
    }));

    try {
      const response = await apiFetch<Message>(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
            message_type: messageType,
            ...(gifData && {
              gif_url: gifData.gifUrl,
              gif_provider: gifData.gifProvider,
              gif_width: gifData.gifWidth,
              gif_height: gifData.gifHeight,
            }),
          }),
        },
      );

      // Replace optimistic message with server response
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: s.messages[conversationId].map((m) =>
            m.id === newMsg.id ? { ...response, authorName: "You" } : m,
          ),
        },
      }));
    } catch {
      // API unavailable — keep optimistic message + simulate reply (mock fallback)
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
              [conversationId]: [
                ...(s.messages[conversationId] || []),
                replyMsg,
              ],
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
            typingUsers: { ...s.typingUsers, [conversationId]: [] },
          }));
        }, 3000);
      }
    }
  },

  addReaction: async (messageId, conversationId, emoji) => {
    // Optimistic update
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]:
          s.messages[conversationId]?.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = [...(m.reactions || [])];
            const existing = reactions.find((r) => r.emoji === emoji);
            if (existing) {
              existing.count += 1;
              existing.userReacted = true;
            } else {
              reactions.push({ emoji, count: 1, userReacted: true });
            }
            return { ...m, reactions };
          }) || [],
      },
    }));

    try {
      await apiFetch(`/api/chat/messages/${messageId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
    } catch {
      // Keep optimistic update in mock mode
    }
  },

  removeReaction: async (messageId, conversationId, emoji) => {
    // Optimistic update
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]:
          s.messages[conversationId]?.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = (m.reactions || [])
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, userReacted: false }
                  : r,
              )
              .filter((r) => r.count > 0);
            return { ...m, reactions };
          }) || [],
      },
    }));

    try {
      await apiFetch(
        `/api/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
        {
          method: "DELETE",
        },
      );
    } catch {
      // Keep optimistic update in mock mode
    }
  },

  handleIncomingMessage: (conversationId, message) => {
    // Don't add if we already have this message (from optimistic update)
    const existing = get().messages[conversationId] || [];
    if (existing.some((m) => m.id === message.id)) return;

    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), message],
      },
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: {
                authorName: message.authorName,
                content: message.content,
                timestamp: message.createdAt,
              },
              unreadCount:
                s.activeConversationId === conversationId
                  ? c.unreadCount
                  : c.unreadCount + 1,
            }
          : c,
      ),
    }));
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
      // Otto conversations pinned at top
      if (a.type === "otto" && b.type !== "otto") return -1;
      if (b.type === "otto" && a.type !== "otto") return 1;
      // Then by last message timestamp
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
