"use client";

import type { CalendarEvent } from "@/lib/mock-calendar";
import { EVENT_TYPE_CONFIG } from "@/lib/mock-calendar";

interface MonthGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onNavigate: (direction: 1 | -1) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Pad start with previous month days
  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Pad end to fill 6 rows
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function dateToKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function MonthGrid({
  currentDate,
  events,
  onDateClick,
  onNavigate,
}: MonthGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getDaysInMonth(year, month);

  // Group events by date key
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = event.date.slice(0, 10);
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(event);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header: nav + month title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(-1)}
          className="rounded-lg bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-border hover:text-text-primary transition-colors"
        >
          Prev
        </button>
        <h2 className="text-lg font-semibold text-text-primary">
          {formatMonthYear(currentDate)}
        </h2>
        <button
          onClick={() => onNavigate(1)}
          className="rounded-lg bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-border hover:text-text-primary transition-colors"
        >
          Next
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-text-muted"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px rounded-lg border border-surface-border overflow-hidden">
        {days.map((day, i) => {
          const key = dateToKey(day);
          const dayEvents = eventsByDate.get(key) || [];
          const isCurrentMonth = day.getMonth() === month;
          const today = isToday(day);

          return (
            <button
              key={i}
              onClick={() => onDateClick?.(day)}
              className={`flex min-h-[80px] flex-col gap-0.5 p-1.5 text-left transition-colors hover:bg-surface-overlay/50 ${
                isCurrentMonth ? "bg-surface-sunken/30" : "bg-surface-sunken/10"
              } ${today ? "ring-1 ring-inset ring-accent-primary/50" : ""}`}
            >
              <span
                className={`text-xs font-medium ${
                  today
                    ? "text-accent-primary"
                    : isCurrentMonth
                      ? "text-text-primary"
                      : "text-text-muted/40"
                }`}
              >
                {day.getDate()}
              </span>

              {/* Event dots (max 3 visible) */}
              <div className="flex flex-col gap-0.5 mt-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-1 overflow-hidden"
                  >
                    <span
                      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${event.dotColor}`}
                    />
                    <span className="truncate text-[9px] text-text-secondary">
                      {event.title.split(" — ")[0]}
                    </span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-text-muted">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
