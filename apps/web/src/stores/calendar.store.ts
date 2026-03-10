import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  EVENT_TYPE_CONFIG,
  MOCK_CALENDAR_EVENTS,
  type CalendarEvent,
  type CalendarEventSource,
} from "@/lib/mock-calendar";
import { mergeDemoEvents } from "@/stores/demo-lifecycle.store";
import { getWorkspaceMode } from "@/stores/onboarding.store";

export type CalendarView = "month" | "week" | "agenda";

/** Shape returned by POST /api/v1/calendar/sync */
interface SyncResponse {
  events: Array<{
    google_event_id: string | null;
    title: string;
    description: string | null;
    start_at: string;
    end_at: string;
    location: string | null;
    attendees: Array<{ name: string }>;
    source: string;
  }>;
  count: number;
  synced: boolean;
}

interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  currentDate: Date;
  view: CalendarView;
  sourceFilter: CalendarEventSource | "all";
  synced: boolean;

  fetchEvents: () => Promise<void>;
  syncFromGoogle: () => Promise<void>;
  setCurrentDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  setSourceFilter: (source: CalendarEventSource | "all") => void;
  navigateMonth: (direction: 1 | -1) => void;
  getFilteredEvents: () => CalendarEvent[];
  getEventsForDate: (dateStr: string) => CalendarEvent[];
}

/** Convert a Google Calendar sync event to the local CalendarEvent format. */
function toCalendarEvent(
  raw: SyncResponse["events"][number],
  index: number,
): CalendarEvent {
  const cfg = EVENT_TYPE_CONFIG.follow_up;
  return {
    id: raw.google_event_id ?? `gcal_sync_${index}`,
    title: raw.title,
    date: raw.start_at,
    eventType: "follow_up",
    source: "calendar",
    vaultSlug: null,
    vaultName: null,
    description: raw.description ?? "",
    color: cfg.color,
    dotColor: cfg.dotColor,
    isAllDay: false,
  };
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,
  currentDate: new Date(2026, 2, 1), // March 2026 to match mock data
  view: "month",
  sourceFilter: "all",
  synced: false,

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ events: CalendarEvent[] }>(
        "/api/v1/calendar/events",
      );
      set({ events: mergeDemoEvents(data.events), isLoading: false });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ events: [], isLoading: false, error: null });
      } else {
        set({
          events: mergeDemoEvents(MOCK_CALENDAR_EVENTS),
          isLoading: false,
          error: null,
        });
      }
    }
  },

  syncFromGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiFetch<SyncResponse>("/api/v1/calendar/sync", {
        method: "POST",
      });
      const synced = result.events.map(toCalendarEvent);
      // Merge synced Google events with existing non-calendar events
      const existing = get().events.filter((e) => e.source !== "calendar");
      set({
        events: mergeDemoEvents([...existing, ...synced]),
        isLoading: false,
        synced: true,
      });
    } catch {
      // Fallback: keep existing events, mark not synced
      set({ isLoading: false, synced: false });
    }
  },

  setCurrentDate: (date) => set({ currentDate: date }),
  setView: (view) => set({ view }),
  setSourceFilter: (source) => set({ sourceFilter: source }),

  navigateMonth: (direction) =>
    set((state) => {
      const next = new Date(state.currentDate);
      next.setMonth(next.getMonth() + direction);
      return { currentDate: next };
    }),

  getFilteredEvents: () => {
    const { events, sourceFilter } = get();
    if (sourceFilter === "all") return events;
    return events.filter((e) => e.source === sourceFilter);
  },

  getEventsForDate: (dateStr) => {
    const { events, sourceFilter } = get();
    const targetDate = dateStr.slice(0, 10); // YYYY-MM-DD
    return events
      .filter((e) => {
        if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
        return e.date.slice(0, 10) === targetDate;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
}));
