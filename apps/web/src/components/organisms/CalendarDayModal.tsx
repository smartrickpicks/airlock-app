"use client";

import Modal from "@/components/molecules/Modal";
import { EVENT_TYPE_CONFIG, type CalendarEvent } from "@/lib/mock-calendar";

interface CalendarDayModalProps {
  date: Date | null;
  events: CalendarEvent[];
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export default function CalendarDayModal({
  date,
  events,
  isOpen,
  onClose,
  onSelectEvent,
}: CalendarDayModalProps) {
  const title = date
    ? date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Day Detail";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="flex flex-col gap-3">
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-border p-6 text-center text-sm text-text-muted">
            No events on this day.
          </div>
        ) : (
          events.map((event) => {
            const eventType = EVENT_TYPE_CONFIG[event.eventType];
            return (
              <button
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className="rounded-lg border border-surface-border bg-surface-raised p-3 text-left transition-colors hover:border-accent-primary/30 hover:bg-surface-overlay"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${event.dotColor}`} />
                  <span className="text-sm font-medium text-text-primary">
                    {event.title}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {eventType.label}
                </p>
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
