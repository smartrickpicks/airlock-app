import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_CALENDAR_EVENTS,
  type CalendarEvent,
  type CalendarEventSource,
} from "@/lib/mock-calendar";

export type CalendarView = "month" | "week" | "agenda";

interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  currentDate: Date;
  view: CalendarView;
  sourceFilter: CalendarEventSource | "all";

  fetchEvents: () => Promise<void>;
  setCurrentDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  setSourceFilter: (source: CalendarEventSource | "all") => void;
  navigateMonth: (direction: 1 | -1) => void;
  getFilteredEvents: () => CalendarEvent[];
  getEventsForDate: (dateStr: string) => CalendarEvent[];
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,
  currentDate: new Date(2026, 2, 1), // March 2026 to match mock data
  view: "month",
  sourceFilter: "all",

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ events: CalendarEvent[] }>(
        "/api/v1/calendar/events",
      );
      set({ events: data.events, isLoading: false });
    } catch {
      set({ events: MOCK_CALENDAR_EVENTS, isLoading: false, error: null });
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
