"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useCalendarStore } from "@/stores/calendar.store";
import type { CalendarEvent, CalendarEventSource } from "@/lib/mock-calendar";
import CalendarDayModal from "@/components/organisms/CalendarDayModal";
import CalendarEventModal from "@/components/organisms/CalendarEventModal";

const FullCalendarView = dynamic(
  () => import("@/components/organisms/FullCalendarView"),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 animate-pulse rounded-lg bg-surface-raised" />
    ),
  },
);

const SOURCES: { id: CalendarEventSource | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "contracts", label: "Contracts" },
  { id: "tasks", label: "Tasks" },
  { id: "crm", label: "CRM" },
  { id: "calendar", label: "Calendar" },
];

export default function CalendarMonthPage() {
  const {
    fetchEvents,
    isLoading,
    currentDate,
    sourceFilter,
    setSourceFilter,
    getFilteredEvents,
    getEventsForDate,
  } = useCalendarStore();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const events = getFilteredEvents();
  const dayEvents = selectedDate
    ? getEventsForDate(selectedDate.toISOString())
    : [];

  const handleDateClick = useCallback((dateStr: string) => {
    setSelectedDate(new Date(dateStr));
  }, []);

  const handleEventClick = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (event) setSelectedEvent(event);
    },
    [events],
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      {/* Header + filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Calendar</h1>
          <p className="text-xs text-text-muted">{events.length} events</p>
        </div>
        <div className="flex items-center gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSourceFilter(s.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sourceFilter === s.id
                  ? "bg-accent-primary text-white"
                  : "bg-surface-overlay text-text-secondary hover:text-text-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading events...</p>
        </div>
      ) : (
        <FullCalendarView
          events={events}
          currentDate={currentDate}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
        />
      )}

      {/* Day modal */}
      <CalendarDayModal
        date={selectedDate}
        events={dayEvents}
        isOpen={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        onSelectEvent={(event) => {
          setSelectedDate(null);
          setSelectedEvent(event);
        }}
      />

      {/* Event detail modal */}
      <CalendarEventModal
        event={selectedEvent}
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
