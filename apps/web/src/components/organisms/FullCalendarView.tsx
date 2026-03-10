"use client";

import { useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import type { CalendarEvent } from "@/lib/mock-calendar";

// Map Tailwind dot classes to actual CSS colors for FullCalendar
const DOT_COLOR_MAP: Record<string, string> = {
  "bg-chamber-ship": "#22c55e",
  "bg-chamber-discover": "#ef4444",
  "bg-chamber-build": "#eab308",
  "bg-chamber-review": "#a855f7",
  "bg-accent-danger": "#ef4444",
  "bg-accent-primary": "#6366f1",
  "bg-accent-secondary": "#8b5cf6",
  "bg-amber-400": "#fbbf24",
  "bg-red-400": "#f87171",
};

interface FullCalendarViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateClick?: (dateStr: string) => void;
  onEventClick?: (eventId: string) => void;
}

export default function FullCalendarView({
  events,
  currentDate,
  onDateClick,
  onEventClick,
}: FullCalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.date,
    allDay: e.isAllDay,
    backgroundColor: DOT_COLOR_MAP[e.dotColor] || "#6366f1",
    borderColor: "transparent",
    textColor: "#f5f5f5",
    extendedProps: { source: e.source, eventType: e.eventType },
  }));

  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      onDateClick?.(info.dateStr);
    },
    [onDateClick],
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      onEventClick?.(info.event.id);
    },
    [onEventClick],
  );

  return (
    <div className="full-calendar-dark rounded-lg border border-surface-border bg-surface-raised p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={currentDate}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        events={fcEvents}
        editable={false}
        selectable
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        dayMaxEvents={3}
        height="auto"
      />
    </div>
  );
}
