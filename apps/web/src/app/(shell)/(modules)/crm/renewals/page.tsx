"use client";

import { useMemo, useState } from "react";
import { MOCK_CRM_RENEWALS } from "@/lib/mock-crm-enhancements";

export default function CrmRenewalsPage() {
  const [selectedRenewalId, setSelectedRenewalId] = useState(
    MOCK_CRM_RENEWALS[0]?.id,
  );
  const [statusNote, setStatusNote] = useState(
    "Select a renewal to inspect timing, contract value, and next-step recommendations.",
  );
  const selectedRenewal = useMemo(
    () =>
      MOCK_CRM_RENEWALS.find((renewal) => renewal.id === selectedRenewalId) ??
      MOCK_CRM_RENEWALS[0],
    [selectedRenewalId],
  );

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Renewals</h1>
          <p className="text-xs text-text-muted">
            Upcoming renewal windows across active customer contracts
          </p>
        </div>
        <span className="rounded-full bg-chamber-ship/15 px-3 py-1 text-xs font-medium text-chamber-ship">
          Customers
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
          <table className="w-full">
            <thead className="bg-surface-overlay">
              <tr className="border-b border-surface-border">
                {["Due Date", "Account", "Contract", "Value", "Status"].map(
                  (label) => (
                    <th
                      key={label}
                      className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {MOCK_CRM_RENEWALS.map((renewal) => (
                <tr
                  key={renewal.id}
                  className={`cursor-pointer border-b border-surface-border-subtle transition-colors hover:bg-surface-overlay ${
                    selectedRenewal.id === renewal.id
                      ? "bg-surface-overlay"
                      : ""
                  }`}
                  onClick={() => setSelectedRenewalId(renewal.id)}
                >
                  <td className="px-4 py-3 text-sm text-text-primary">
                    {renewal.dueDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {renewal.accountName}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {renewal.contractName}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-text-primary">
                    ${renewal.value.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface-overlay px-2 py-1 text-[10px] font-medium text-text-secondary">
                      {renewal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Renewal Detail
          </div>
          <div className="mt-3 text-base font-semibold text-text-primary">
            {selectedRenewal.accountName}
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            {selectedRenewal.contractName} · $
            {selectedRenewal.value.toLocaleString()}
          </div>
          <div className="mt-4 space-y-3">
            <RenewalMetric label="Due Window" value={selectedRenewal.dueDate} />
            <RenewalMetric label="Status" value={selectedRenewal.status} />
            <RenewalMetric
              label="Recommended Action"
              value={
                selectedRenewal.status === "urgent"
                  ? "Escalate owner and start renewal packet."
                  : selectedRenewal.status === "upcoming"
                    ? "Open renewal review and prepare commercial update."
                    : "Monitor and queue outreach."
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setStatusNote(
                  `Opened renewal work packet for ${selectedRenewal.accountName}.`,
                )
              }
            >
              Open Packet
            </button>
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setStatusNote(
                  `Queued outreach to ${selectedRenewal.accountName}.`,
                )
              }
            >
              Queue Outreach
            </button>
          </div>
          <div className="mt-3 text-xs text-text-muted">{statusNote}</div>
        </div>
      </div>
    </div>
  );
}

function RenewalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
