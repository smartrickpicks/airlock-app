"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { MOCK_CRM_ACTIVITY } from "@/lib/mock-crm-enhancements";

const EVENT_ICON = {
  text: MessageSquare,
  email: Mail,
  call: Phone,
  deal: TrendingUp,
  task: CheckCircle2,
  lead: UserPlus,
  alert: AlertTriangle,
} as const;

export default function CrmActivityPage() {
  const [selectedEventId, setSelectedEventId] = useState(
    MOCK_CRM_ACTIVITY[0]?.id,
  );
  const [filter, setFilter] = useState<
    "all" | (typeof MOCK_CRM_ACTIVITY)[number]["type"]
  >("all");
  const selectedEvent = useMemo(
    () =>
      MOCK_CRM_ACTIVITY.find((event) => event.id === selectedEventId) ??
      MOCK_CRM_ACTIVITY[0],
    [selectedEventId],
  );
  const visibleEvents = useMemo(
    () =>
      filter === "all"
        ? MOCK_CRM_ACTIVITY
        : MOCK_CRM_ACTIVITY.filter((event) => event.type === filter),
    [filter],
  );

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Activity Feed
          </h1>
          <p className="text-xs text-text-muted">
            Cross-account activity, communication, and lifecycle events
          </p>
        </div>
        <span className="rounded-full bg-chamber-review/15 px-3 py-1 text-xs font-medium text-chamber-review">
          Accounts
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "text", "deal", "task", "lead"] as const).map((value) => (
          <button
            key={value}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === value
                ? "bg-accent-primary text-background"
                : "bg-surface-raised text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setFilter(value)}
          >
            {value === "all" ? "All" : value}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {visibleEvents.map((event) => {
            const Icon = EVENT_ICON[event.type];
            return (
              <button
                key={event.id}
                className={`block w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedEvent.id === event.id
                    ? "border-accent-primary bg-surface-raised"
                    : "border-surface-border bg-surface-raised hover:bg-surface-overlay"
                }`}
                onClick={() => setSelectedEventId(event.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-surface-overlay p-2">
                      <Icon size={16} className="text-accent-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {event.title}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        {event.accountName} · {event.timestamp}
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">
                        {event.detail}
                      </p>
                    </div>
                  </div>
                  {event.actionLabel ? (
                    <span className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary">
                      {event.actionLabel}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Event Detail
          </div>
          <div className="mt-3 text-base font-semibold text-text-primary">
            {selectedEvent.title}
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            {selectedEvent.accountName} · {selectedEvent.timestamp}
          </div>
          <p className="mt-4 text-sm text-text-secondary">
            {selectedEvent.detail}
          </p>
          <div className="mt-4 space-y-2 text-sm text-text-secondary">
            <div>- Trigger type: {selectedEvent.type}</div>
            <div>
              - Suggested next move:{" "}
              {selectedEvent.actionLabel ?? "Log and monitor"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
