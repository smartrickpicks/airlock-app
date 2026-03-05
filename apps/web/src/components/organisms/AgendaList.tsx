"use client";

import type { CalendarEvent } from "@/lib/mock-calendar";
import { EVENT_TYPE_CONFIG, SOURCE_LABELS } from "@/lib/mock-calendar";

interface AgendaListProps {
  events: CalendarEvent[];
}

function formatAgendaDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDueCountdown(dateStr: string): { text: string; color: string } {
  const now = new Date();
  const due = new Date(dateStr);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 0) {
    return {
      text: `${Math.abs(diffHours)}h overdue`,
      color: "text-accent-danger",
    };
  }
  if (diffHours < 24) {
    return { text: `Due in ${diffHours}h`, color: "text-amber-400" };
  }
  const diffDays = Math.round(diffHours / 24);
  return { text: `Due in ${diffDays}d`, color: "text-text-muted" };
}

function isDateToday(dateStr: string): boolean {
  const now = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function AgendaList({ events }: AgendaListProps) {
  // Sort by date
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Group by date (YYYY-MM-DD)
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of sorted) {
    const key = event.date.slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-text-muted">
          No events match the current filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(grouped.entries()).map(([dateKey, dayEvents]) => {
        const today = isDateToday(dateKey);
        const dateLabel = today
          ? `Today — ${formatAgendaDate(dateKey)}`
          : formatAgendaDate(dateKey);

        return (
          <div key={dateKey}>
            {/* Date header */}
            <div
              className={`mb-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                today
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "bg-surface-overlay text-text-muted"
              }`}
            >
              {dateLabel}
            </div>

            {/* Events for this date */}
            <div className="flex flex-col gap-1">
              {dayEvents.map((event) => {
                const countdown = formatDueCountdown(event.date);
                const typeCfg = EVENT_TYPE_CONFIG[event.eventType];

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-raised p-3 hover:border-text-muted/30 transition-colors cursor-pointer"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${event.dotColor}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary">
                        {event.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${typeCfg.color}`}
                        >
                          {typeCfg.label}
                        </span>
                        <span>{SOURCE_LABELS[event.source]}</span>
                        {event.vaultName && (
                          <>
                            <span className="text-text-muted/40">&gt;</span>
                            <span>{event.vaultName}</span>
                          </>
                        )}
                      </div>
                      {event.description && (
                        <div className="mt-1 text-xs text-text-secondary line-clamp-1">
                          {event.description}
                        </div>
                      )}
                    </div>
                    <span
                      className={`flex-shrink-0 font-mono text-[10px] ${countdown.color}`}
                    >
                      {countdown.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
