import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { Conversation, Message, UserStatus } from "@/lib/mock-messenger";
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_REPLIES,
  MOCK_USER_STATUSES,
} from "@/lib/mock-messenger";
import { getWorkspaceMode } from "@/stores/onboarding.store";
import { getWebSocket } from "@/lib/websocket";

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

  createConversation: (
    participantIds: string[],
    topic?: string,
  ) => Promise<Conversation | null>;
  initRealtimeHandlers: () => void;
  sendTypingIndicator: (conversationId: string) => void;

  setConversationPersonaMode: (
    conversationId: string,
    mode: string | null,
  ) => void;

  replyTo: { messageId: string; authorName: string; content: string } | null;
  setReplyTo: (messageId: string, authorName: string, content: string) => void;
  clearReplyTo: () => void;

  editingMessageId: string | null;
  deletingMessageId: string | null;
  setEditingMessage: (messageId: string | null) => void;
  setDeletingMessage: (messageId: string | null) => void;
  editMessage: (
    conversationId: string,
    messageId: string,
    content: string,
  ) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;

  sendFileMessage: (
    conversationId: string,
    fileData: {
      fileName: string;
      fileSize: number;
      fileUrl: string;
      fileMimeType: string;
    },
  ) => void;

  pinMessage: (conversationId: string, messageId: string) => void;
  unpinMessage: (conversationId: string, messageId: string) => void;

  bookmarkMessage: (messageId: string) => void;
  unbookmarkMessage: (messageId: string) => void;

  archiveConversation: (conversationId: string) => Promise<void>;

  forwardMessage: (messageId: string, targetConversationId: string) => void;

  userStatuses: Record<string, UserStatus>;
  setUserStatus: (emoji: string, text: string, expiresAt?: string) => void;
  clearUserStatus: () => void;

  filteredConversations: (activeModule: string) => Conversation[];
  totalUnread: () => number;
}

let replyTimeout: ReturnType<typeof setTimeout> | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
let lastTypingSent = 0;

function subscribeToConversation(conversationId: string) {
  try {
    const ws = getWebSocket();
    ws.subscribe(`chat:${conversationId}`);
    ws.subscribe(`chat:${conversationId}:typing`);
    ws.subscribe(`chat:${conversationId}:reactions`);
    ws.subscribe(`chat:${conversationId}:read`);
  } catch {
    // WebSocket unavailable
  }
}

export const useMessengerStore = create<MessengerState>((set, get) => ({
  conversations: [],
  messages: {},
  isLoading: false,

  isDrawerOpen: false,
  activeConversationId: null,
  scope: "module",
  searchQuery: "",
  typingUsers: {},
  userStatuses: MOCK_USER_STATUSES,

  replyTo: null,
  setReplyTo: (messageId, authorName, content) =>
    set({ replyTo: { messageId, authorName, content } }),
  clearReplyTo: () => set({ replyTo: null }),

  editingMessageId: null,
  deletingMessageId: null,
  setEditingMessage: (messageId) => set({ editingMessageId: messageId }),
  setDeletingMessage: (messageId) => set({ deletingMessageId: messageId }),

  editMessage: async (conversationId, messageId, content) => {
    const now = new Date().toISOString();
    // Optimistic update
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]:
          s.messages[conversationId]?.map((m) =>
            m.id === messageId ? { ...m, content, editedAt: now } : m,
          ) || [],
      },
      editingMessageId: null,
    }));

    try {
      await apiFetch(`/api/chat/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });
    } catch {
      // Keep optimistic update in mock mode
    }
  },

  deleteMessage: async (conversationId, messageId) => {
    // Optimistic remove
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]:
          s.messages[conversationId]?.filter((m) => m.id !== messageId) || [],
      },
      deletingMessageId: null,
    }));

    try {
      await apiFetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
      });
    } catch {
      // Keep optimistic update in mock mode
    }
  },

  sendFileMessage: (conversationId, fileData) => {
    const now = new Date().toISOString();
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      authorId: "user_self",
      authorName: "You",
      content: fileData.fileName,
      messageType: "file",
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      fileUrl: fileData.fileUrl,
      fileMimeType: fileData.fileMimeType,
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
                content: fileData.fileName,
                timestamp: now,
              },
            }
          : c,
      ),
    }));
  },

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

      // Subscribe to WebSocket topics for each conversation
      data.conversations.forEach((conv) => subscribeToConversation(conv.id));
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ conversations: [], messages: {}, isLoading: false });
      } else {
        set({
          conversations: MOCK_CONVERSATIONS,
          messages: MOCK_MESSAGES,
          userStatuses: MOCK_USER_STATUSES,
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
    const currentReplyTo = get().replyTo;
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
      ...(currentReplyTo && {
        replyToId: currentReplyTo.messageId,
        replyPreview: {
          authorName: currentReplyTo.authorName,
          content: currentReplyTo.content,
        },
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

    get().clearReplyTo();

    try {
      const response = await apiFetch<Message>(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
            message_type: messageType,
            ...(currentReplyTo && { reply_to_id: currentReplyTo.messageId }),
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

  createConversation: async (participantIds, topic) => {
    try {
      const conv = await apiFetch<Conversation>("/api/chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          conversation_type: participantIds.length === 1 ? "dm" : "group",
          participant_ids: participantIds,
          topic,
        }),
      });
      set((s) => ({
        conversations: [conv, ...s.conversations],
      }));
      subscribeToConversation(conv.id);
      return conv;
    } catch {
      return null;
    }
  },

  initRealtimeHandlers: () => {
    let ws: ReturnType<typeof getWebSocket>;
    try {
      ws = getWebSocket();
    } catch {
      return;
    }

    // Incoming messages
    ws.onEvent("chat:*", (topic: string, event: Record<string, unknown>) => {
      const parts = topic.split(":");
      if (parts.length > 2) return;

      const conversationId = parts[1];

      if (event.event_type === "message.sent" && event.message) {
        const msg = event.message as Message;
        // Skip own messages (optimistic update already applied)
        if (msg.authorId === "user_self") return;
        // Skip Otto messages if we're viewing that conversation (we get them via SSE)
        if (
          msg.authorId === "otto" &&
          get().activeConversationId === conversationId
        )
          return;
        get().handleIncomingMessage(conversationId, msg);
      }
    });

    // Typing indicators
    ws.onEvent("chat:*", (topic: string, event: Record<string, unknown>) => {
      if (!topic.includes(":typing")) return;
      const conversationId = topic.split(":")[1];
      const userName = event.user_name as string;
      if (!userName) return;

      set((s) => ({
        typingUsers: {
          ...s.typingUsers,
          [conversationId]: [
            ...(s.typingUsers[conversationId] || []).filter(
              (n) => n !== userName,
            ),
            userName,
          ],
        },
      }));

      setTimeout(() => {
        set((s) => ({
          typingUsers: {
            ...s.typingUsers,
            [conversationId]: (s.typingUsers[conversationId] || []).filter(
              (n) => n !== userName,
            ),
          },
        }));
      }, 4000);
    });

    // Reactions
    ws.onEvent("chat:*", (topic: string, event: Record<string, unknown>) => {
      if (!topic.includes(":reactions")) return;
      const conversationId = topic.split(":")[1];
      const messageId = event.message_id as string;
      if (!messageId) return;

      const messages = get().messages[conversationId] || [];
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;

      const message = messages[idx];
      let updatedReactions = [...(message.reactions || [])];

      if (event.event_type === "reaction.added") {
        const emoji = (event.reaction as Record<string, unknown>)
          ?.emoji as string;
        if (emoji) {
          const existing = updatedReactions.find((r) => r.emoji === emoji);
          if (existing) {
            existing.count += 1;
          } else {
            updatedReactions.push({ emoji, count: 1, userReacted: false });
          }
        }
      } else if (event.event_type === "reaction.removed") {
        const emoji = event.emoji as string;
        updatedReactions = updatedReactions
          .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1 } : r))
          .filter((r) => r.count > 0);
      }

      const updated = [...messages];
      updated[idx] = { ...message, reactions: updatedReactions };
      set((s) => ({
        messages: { ...s.messages, [conversationId]: updated },
      }));
    });

    // Read receipts
    ws.onEvent("chat:*", (topic: string, event: Record<string, unknown>) => {
      if (!topic.includes(":read")) return;
      const conversationId = topic.split(":")[1];
      const userId = event.user_id as string;
      if (!userId) return;

      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id !== conversationId
            ? c
            : {
                ...c,
                participants: c.participants.map((p) =>
                  p.userId === userId
                    ? { ...p, lastReadAt: event.last_read_at as string }
                    : p,
                ),
              },
        ),
      }));
    });

    // Listen for being added to a conversation
    ws.onEvent("user:*", (_topic: string, event: Record<string, unknown>) => {
      if (event.event_type === "conversation.added" && event.conversation) {
        const conv = event.conversation as Conversation;
        set((s) => ({
          conversations: [conv, ...s.conversations],
        }));
        subscribeToConversation(conv.id);
      }
    });
  },

  setConversationPersonaMode: (conversationId, mode) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, personaMode: mode ?? undefined } : c,
      ),
    }));
  },

  pinMessage: (conversationId, messageId) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]:
          s.messages[conversationId]?.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  pinned: true,
                  pinnedBy: "You",
                  pinnedAt: new Date().toISOString(),
                }
              : m,
          ) || [],
      },
    }));
  },

  unpinMessage: (conversationId, messageId) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]:
          s.messages[conversationId]?.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  pinned: false,
                  pinnedBy: undefined,
                  pinnedAt: undefined,
                }
              : m,
          ) || [],
      },
    }));
  },

  bookmarkMessage: (messageId) => {
    set((s) => ({
      messages: Object.fromEntries(
        Object.entries(s.messages).map(([convId, msgs]) => [
          convId,
          msgs.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  bookmarked: true,
                  bookmarkedAt: new Date().toISOString(),
                }
              : m,
          ),
        ]),
      ),
    }));
    apiFetch(`/api/chat/messages/${messageId}/bookmark`, {
      method: "POST",
    }).catch(() => {});
  },

  unbookmarkMessage: (messageId) => {
    set((s) => ({
      messages: Object.fromEntries(
        Object.entries(s.messages).map(([convId, msgs]) => [
          convId,
          msgs.map((m) =>
            m.id === messageId
              ? { ...m, bookmarked: false, bookmarkedAt: undefined }
              : m,
          ),
        ]),
      ),
    }));
    apiFetch(`/api/chat/messages/${messageId}/bookmark`, {
      method: "DELETE",
    }).catch(() => {});
  },

  archiveConversation: async (conversationId) => {
    // Optimistic: remove from list
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== conversationId),
      activeConversationId:
        s.activeConversationId === conversationId
          ? null
          : s.activeConversationId,
    }));

    try {
      await apiFetch(`/api/chat/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      });
    } catch {
      // Keep optimistic update in mock mode
    }
  },

  forwardMessage: (messageId, targetConversationId) => {
    const { messages, conversations } = get();
    const originalMsg = Object.values(messages)
      .flat()
      .find((m) => m.id === messageId);
    if (!originalMsg) return;

    const sourceConv = conversations.find(
      (c) => c.id === originalMsg.conversationId,
    );
    const now = new Date().toISOString();

    const forwarded: Message = {
      id: `msg_fwd_${Date.now()}`,
      conversationId: targetConversationId,
      authorId: "user_self",
      authorName: "You",
      content: originalMsg.content,
      messageType: originalMsg.messageType,
      createdAt: now,
      forwardedFrom: {
        messageId: originalMsg.id,
        senderName: originalMsg.authorName,
        conversationName: sourceConv?.name || "Unknown",
      },
    };

    set((s) => ({
      messages: {
        ...s.messages,
        [targetConversationId]: [
          ...(s.messages[targetConversationId] || []),
          forwarded,
        ],
      },
      conversations: s.conversations.map((c) =>
        c.id === targetConversationId
          ? {
              ...c,
              lastMessage: {
                authorName: "You",
                content: originalMsg.content,
                timestamp: now,
              },
            }
          : c,
      ),
    }));

    apiFetch(`/api/chat/conversations/${targetConversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: originalMsg.content,
        type: originalMsg.messageType,
        forwarded_from: originalMsg.id,
      }),
    }).catch(() => {});
  },

  sendTypingIndicator: (conversationId: string) => {
    const now = Date.now();
    if (now - lastTypingSent < 3000) return;
    lastTypingSent = now;

    apiFetch(`/api/chat/conversations/${conversationId}/typing`, {
      method: "POST",
    }).catch(() => {
      // Fire-and-forget
    });
  },

  setUserStatus: (emoji, text, expiresAt) => {
    const currentUserId = "user_001";
    set({
      userStatuses: {
        ...get().userStatuses,
        [currentUserId]: { userId: currentUserId, emoji, text, expiresAt },
      },
    });
    apiFetch("/api/chat/status", {
      method: "PUT",
      body: JSON.stringify({ emoji, text, expires_at: expiresAt }),
    }).catch(() => {});
  },

  clearUserStatus: () => {
    const currentUserId = "user_001";
    const statuses = { ...get().userStatuses };
    delete statuses[currentUserId];
    set({ userStatuses: statuses });
    apiFetch("/api/chat/status", { method: "DELETE" }).catch(() => {});
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
