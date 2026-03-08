"use client";

import { useState } from "react";
import Modal from "@/components/molecules/Modal";
import {
  EVENT_TYPE_CONFIG,
  SOURCE_LABELS,
  type CalendarEvent,
} from "@/lib/mock-calendar";

interface CalendarEventModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatEventDate(date: string, isAllDay: boolean): string {
  return new Date(date).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(isAllDay ? {} : { hour: "numeric", minute: "2-digit" }),
  });
}

export default function CalendarEventModal({
  event,
  isOpen,
  onClose,
}: CalendarEventModalProps) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  if (!event) return null;

  const eventType = EVENT_TYPE_CONFIG[event.eventType];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Event Detail" size="md">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${event.dotColor}`} />
            <h3 className="text-base font-semibold text-text-primary">
              {event.title}
            </h3>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {event.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetaItem
            label="Date"
            value={formatEventDate(event.date, event.isAllDay)}
          />
          <MetaItem label="Type" value={eventType.label} />
          <MetaItem label="Source" value={SOURCE_LABELS[event.source]} />
          <MetaItem
            label="Vault"
            value={event.vaultName || event.vaultSlug || "Workspace"}
          />
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Demo Actions
          </h4>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() =>
                setActionMessage("Related record opened in demo mode.")
              }
              className="rounded-lg bg-accent-primary px-3 py-2 text-xs font-medium text-text-inverse"
            >
              Open Related Record
            </button>
            <button
              onClick={() =>
                setActionMessage("Reminder scheduled in demo mode.")
              }
              className="rounded-lg bg-surface-overlay px-3 py-2 text-xs font-medium text-text-secondary"
            >
              Add Reminder
            </button>
          </div>
          {actionMessage ? (
            <p className="mt-3 text-xs text-accent-primary">{actionMessage}</p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
