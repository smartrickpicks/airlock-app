import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type {
  QueueName,
  QueueStats,
  EventBusJob,
  DLQEntry,
  EventFlowPoint,
} from "@/lib/mock-event-bus";
import {
  MOCK_QUEUE_STATS,
  MOCK_RECENT_JOBS,
  MOCK_DLQ_ENTRIES,
  MOCK_EVENT_FLOW,
} from "@/lib/mock-event-bus";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface EventBusState {
  queueStats: QueueStats[];
  recentJobs: EventBusJob[];
  dlqEntries: DLQEntry[];
  eventFlow: EventFlowPoint[];

  isLoading: boolean;
  selectedQueue: QueueName | null;
  selectedJob: EventBusJob | null;

  fetchEventBus: () => Promise<void>;
  selectQueue: (queue: QueueName | null) => void;
  selectJob: (job: EventBusJob | null) => void;
  retryDLQJob: (entryId: string) => void;
  retryAllDLQ: (queueName: QueueName) => void;
  purgeDLQ: (queueName: QueueName) => void;

  filteredJobs: () => EventBusJob[];
  queueHealth: (queue: QueueStats) => "healthy" | "degraded" | "critical";
  totalEventsPerSecond: () => number;
}

export const useEventBusStore = create<EventBusState>((set, get) => ({
  queueStats: [],
  recentJobs: [],
  dlqEntries: [],
  eventFlow: [],

  isLoading: false,
  selectedQueue: null,
  selectedJob: null,

  fetchEventBus: async () => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{
        queueStats: QueueStats[];
        recentJobs: EventBusJob[];
        dlqEntries: DLQEntry[];
        eventFlow: EventFlowPoint[];
      }>("/api/v1/admin/event-bus");
      set({
        queueStats: data.queueStats,
        recentJobs: data.recentJobs,
        dlqEntries: data.dlqEntries,
        eventFlow: data.eventFlow,
        isLoading: false,
      });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({
          queueStats: [],
          recentJobs: [],
          dlqEntries: [],
          eventFlow: [],
          isLoading: false,
        });
      } else {
        set({
          queueStats: MOCK_QUEUE_STATS,
          recentJobs: MOCK_RECENT_JOBS,
          dlqEntries: MOCK_DLQ_ENTRIES,
          eventFlow: MOCK_EVENT_FLOW,
          isLoading: false,
        });
      }
    }
  },

  selectQueue: (queue) => set({ selectedQueue: queue, selectedJob: null }),

  selectJob: (job) => set({ selectedJob: job }),

  retryDLQJob: (entryId) =>
    set((state) => ({
      dlqEntries: state.dlqEntries.filter((e) => e.id !== entryId),
    })),

  retryAllDLQ: (queueName) =>
    set((state) => ({
      dlqEntries: state.dlqEntries.filter((e) => e.queueName !== queueName),
    })),

  purgeDLQ: (queueName) =>
    set((state) => ({
      dlqEntries: state.dlqEntries.filter((e) => e.queueName !== queueName),
    })),

  filteredJobs: () => {
    const { recentJobs, selectedQueue } = get();
    if (!selectedQueue) return recentJobs;
    return recentJobs.filter((j) => j.queueName === selectedQueue);
  },

  queueHealth: (queue) => {
    const total = queue.completed + queue.failed;
    if (total === 0) return "healthy";
    const failRate = queue.failed / total;
    if (failRate > 0.01 || queue.dlqSize > 3) return "critical";
    if (failRate > 0.001 || queue.dlqSize > 0) return "degraded";
    return "healthy";
  },

  totalEventsPerSecond: () => {
    const { queueStats } = get();
    const totalCompleted = queueStats.reduce((sum, q) => sum + q.completed, 0);
    return Math.round((totalCompleted / 3600) * 100) / 100;
  },
}));
