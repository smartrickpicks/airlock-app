import { create } from "zustand";
import type {
  ConnectionStatus,
  RealtimeTopic,
  PresenceUser,
  RealtimeEvent,
} from "@/lib/mock-realtime";
import { MOCK_PRESENCE, MOCK_REALTIME_EVENTS } from "@/lib/mock-realtime";
import { getWorkspaceMode } from "@/stores/onboarding.store";

type EventHandler = (event: RealtimeEvent) => void;

interface RealtimeState {
  // Connection
  status: ConnectionStatus;
  reconnectAttempts: number;

  // Subscriptions
  subscriptions: Set<RealtimeTopic>;

  // Presence
  presenceUsers: PresenceUser[];

  // Event log (recent events for debugging/display)
  recentEvents: RealtimeEvent[];

  // Event handlers
  handlers: Map<string, Set<EventHandler>>;

  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribe: (topic: RealtimeTopic) => void;
  unsubscribe: (topic: RealtimeTopic) => void;
  onEvent: (topic: string, handler: EventHandler) => () => void;
  simulateEvent: (event: RealtimeEvent) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  status: "disconnected",
  reconnectAttempts: 0,
  subscriptions: new Set(),
  presenceUsers: [],
  recentEvents: [],
  handlers: new Map(),

  connect: () => {
    // Mock: simulate connection lifecycle
    set({ status: "reconnecting", reconnectAttempts: 0 });

    // Simulate connection delay
    setTimeout(() => {
      if (getWorkspaceMode() === "clean") {
        set({
          status: "connected",
          presenceUsers: [],
          recentEvents: [],
          subscriptions: new Set([
            "notifications:*",
            "presence:*",
          ] as RealtimeTopic[]),
        });
      } else {
        set({
          status: "connected",
          presenceUsers: [...MOCK_PRESENCE],
          recentEvents: [...MOCK_REALTIME_EVENTS],
          subscriptions: new Set([
            "notifications:*",
            "presence:*",
          ] as RealtimeTopic[]),
        });
      }
    }, 800);
  },

  disconnect: () => {
    set({
      status: "disconnected",
      presenceUsers: [],
      subscriptions: new Set(),
      reconnectAttempts: 0,
    });
  },

  subscribe: (topic) => {
    set((s) => {
      const next = new Set(s.subscriptions);
      next.add(topic);
      return { subscriptions: next };
    });
  },

  unsubscribe: (topic) => {
    set((s) => {
      const next = new Set(s.subscriptions);
      next.delete(topic);
      return { subscriptions: next };
    });
  },

  onEvent: (topic, handler) => {
    const { handlers } = get();
    if (!handlers.has(topic)) {
      handlers.set(topic, new Set());
    }
    handlers.get(topic)!.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.get(topic)?.delete(handler);
    };
  },

  simulateEvent: (event) => {
    set((s) => ({
      recentEvents: [event, ...s.recentEvents].slice(0, 50),
    }));

    // Dispatch to handlers
    const { handlers } = get();
    const topicHandlers = handlers.get(event.topic);
    if (topicHandlers) {
      topicHandlers.forEach((h) => h(event));
    }
    // Also dispatch to wildcard handlers
    const wildcardTopic = event.topic.split(":")[0] + ":*";
    const wildcardHandlers = handlers.get(wildcardTopic);
    if (wildcardHandlers) {
      wildcardHandlers.forEach((h) => h(event));
    }
  },
}));
