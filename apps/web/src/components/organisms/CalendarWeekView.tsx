"use client";

import { useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent } from "@/lib/mock-calendar";
import CalendarEventModal from "@/components/organisms/CalendarEventModal";

/* ── colour mapping by source ── */
const SOURCE_BG: Record<string, string> = {
  contracts: "bg-chamber-discover/80 border-chamber-discover/40",
  crm: "bg-accent-primary/80 border-accent-primary/40",
  tasks: "bg-chamber-build/80 border-chamber-build/40",
  calendar: "bg-chamber-ship/80 border-chamber-ship/40",
};

const SOURCE_TEXT: Record<string, string> = {
  contracts: "text-white",
  crm: "text-white",
  tasks: "text-surface-base",
  calendar: "text-white",
};

/* ── helpers ── */
const HOUR_START = 7;
const HOUR_END = 21; // 9pm
const HOURS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i,
);
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function weekRangeLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  if (monday.getFullYear() !== sunday.getFullYear()) {
    return `${monday.toLocaleDateString("en-US", yearOpts)} – ${sunday.toLocaleDateString("en-US", yearOpts)}`;
  }
  if (monday.getMonth() !== sunday.getMonth()) {
    return `${monday.toLocaleDateString("en-US", opts)} – ${sunday.toLocaleDateString("en-US", yearOpts)}`;
  }
  return `${monday.toLocaleDateString("en-US", opts)} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

/* ── component ── */
interface CalendarWeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onNavigateWeek: (direction: 1 | -1) => void;
  onToday: () => void;
}

export default function CalendarWeekView({
  events,
  currentDate,
  onNavigateWeek,
  onToday,
}: CalendarWeekViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  const monday = useMemo(() => getMonday(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [monday]);

  const today = useMemo(() => new Date(), []);

  /* split events into all-day vs timed, bucketed by day index (0-6) */
  const { allDayByCol, timedByCol } = useMemo(() => {
    const allDay: Record<number, CalendarEvent[]> = {};
    const timed: Record<number, CalendarEvent[]> = {};
    for (let i = 0; i < 7; i++) {
      allDay[i] = [];
      timed[i] = [];
    }

    for (const ev of events) {
      const evDate = new Date(ev.date);
      const colIdx = weekDays.findIndex((d) => isSameDay(d, evDate));
      if (colIdx === -1) continue;
      if (ev.isAllDay) {
        allDay[colIdx].push(ev);
      } else {
        timed[colIdx].push(ev);
      }
    }

    return { allDayByCol: allDay, timedByCol: timed };
  }, [events, weekDays]);

  const hasAllDay = Object.values(allDayByCol).some((arr) => arr.length > 0);

  const handleEventClick = useCallback((ev: CalendarEvent) => {
    setSelectedEvent(ev);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* ── header: nav + title ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateWeek(-1)}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onNavigateWeek(1)}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={onToday}
            className="rounded-full bg-surface-overlay px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-border hover:text-text-primary"
          >
            Today
          </button>
        </div>
        <h2 className="text-sm font-semibold text-text-primary">
          {weekRangeLabel(monday)}
        </h2>
      </div>

      {/* ── grid ── */}
      <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
        {/* day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-surface-border">
          <div className="border-r border-surface-border" />
          {weekDays.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div
                key={i}
                className={`border-r border-surface-border px-2 py-2 text-center last:border-r-0 ${
                  isToday ? "bg-accent-primary/10" : ""
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {DAY_LABELS[i]}
                </div>
                <div
                  className={`mt-0.5 text-sm font-medium ${
                    isToday ? "text-accent-primary" : "text-text-primary"
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* all-day row */}
        {hasAllDay && (
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-surface-border">
            <div className="flex items-start justify-end border-r border-surface-border px-1 pt-1">
              <span className="text-[9px] font-medium uppercase text-text-muted">
                All day
              </span>
            </div>
            {weekDays.map((_, colIdx) => (
              <div
                key={colIdx}
                className="min-h-[32px] border-r border-surface-border p-0.5 last:border-r-0"
              >
                {allDayByCol[colIdx].map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => handleEventClick(ev)}
                    className={`mb-0.5 w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight ${
                      SOURCE_BG[ev.source] ?? "bg-surface-overlay"
                    } ${SOURCE_TEXT[ev.source] ?? "text-text-primary"}`}
                  >
                    {ev.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* time grid */}
        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-surface-border/50 last:border-b-0"
            >
              <div className="flex items-start justify-end border-r border-surface-border px-1 pt-0.5">
                <span className="text-[10px] text-text-muted">
                  {formatHour(hour)}
                </span>
              </div>
              {weekDays.map((_, colIdx) => {
                const eventsInHour = timedByCol[colIdx].filter((ev) => {
                  const h = new Date(ev.date).getHours();
                  return h === hour;
                });
                return (
                  <div
                    key={colIdx}
                    className="relative min-h-[48px] border-r border-surface-border/50 p-0.5 last:border-r-0"
                  >
                    {eventsInHour.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => handleEventClick(ev)}
                        className={`mb-0.5 w-full truncate rounded border-l-2 px-1.5 py-1 text-left text-[10px] font-medium leading-tight transition-opacity hover:opacity-90 ${
                          SOURCE_BG[ev.source] ?? "bg-surface-overlay"
                        } ${SOURCE_TEXT[ev.source] ?? "text-text-primary"}`}
                        title={ev.title}
                      >
                        <span className="block truncate">{ev.title}</span>
                        <span className="block text-[9px] opacity-80">
                          {new Date(ev.date).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* event detail modal */}
      <CalendarEventModal
        event={selectedEvent}
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
