"use client";

import { useState } from "react";
import { MOCK_CRM_QUALIFY_COLUMNS } from "@/lib/mock-crm-enhancements";

const COLUMNS: Array<{ id: string; label: string; items: string[] }> = [
  {
    id: "captured",
    label: "Captured",
    items: [...MOCK_CRM_QUALIFY_COLUMNS.captured],
  },
  {
    id: "reviewing",
    label: "Reviewing",
    items: [...MOCK_CRM_QUALIFY_COLUMNS.reviewing],
  },
  {
    id: "ready",
    label: "Ready for Build",
    items: [...MOCK_CRM_QUALIFY_COLUMNS.ready],
  },
];

export default function CrmQualifyPage() {
  const [selectedItem, setSelectedItem] = useState<string>(COLUMNS[0].items[0]);
  const [statusNote, setStatusNote] = useState(
    "Review the intake packet, confirm ownership, then promote it to Build.",
  );
  const selectedColumn =
    COLUMNS.find((column) => column.items.includes(selectedItem)) ?? COLUMNS[0];

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Qualify Funnel
          </h1>
          <p className="text-xs text-text-muted">
            Discovery intake routed through human review before Build
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-primary">
          Discover
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <div
              key={column.id}
              className="rounded-lg border border-surface-border bg-surface-raised p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {column.label}
              </div>
              <div className="mt-4 space-y-3">
                {column.items.map((item) => (
                  <button
                    key={item}
                    className={`block w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      selectedItem === item
                        ? "border-accent-primary bg-surface-overlay text-text-primary"
                        : "border-surface-border bg-surface-overlay text-text-secondary hover:bg-surface-raised"
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Qualification Detail
          </div>
          <div className="mt-3 text-base font-semibold text-text-primary">
            {selectedItem}
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            Current lane: {selectedColumn.label}
          </div>
          <div className="mt-4 space-y-3">
            <DetailCard label="Recommended Owner" value="Ana Chen" />
            <DetailCard
              label="Next Best Action"
              value="Confirm stakeholder coverage and schedule follow-up."
            />
            <DetailCard
              label="Contract Readiness"
              value={
                selectedColumn.id === "ready"
                  ? "Ready to stage draft"
                  : "Still gathering inputs"
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setStatusNote(`${selectedItem} routed to human review.`)
              }
            >
              Open Review Gate
            </button>
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setStatusNote(`${selectedItem} marked ready for Build.`)
              }
            >
              Promote to Build
            </button>
          </div>
          <div className="mt-3 text-xs text-text-muted">{statusNote}</div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
