"use client";

import { useMemo, useState } from "react";
import { MOCK_CRM_DEAL_REVIEW } from "@/lib/mock-crm-enhancements";

export default function CrmDealReviewPage() {
  const [selectedDealId, setSelectedDealId] = useState(
    MOCK_CRM_DEAL_REVIEW[0]?.id,
  );
  const [statusNote, setStatusNote] = useState(
    "Select a deal to inspect blocker detail and choose the next resolution step.",
  );
  const selectedDeal = useMemo(
    () =>
      MOCK_CRM_DEAL_REVIEW.find((item) => item.id === selectedDealId) ??
      MOCK_CRM_DEAL_REVIEW[0],
    [selectedDealId],
  );

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Deal Review
          </h1>
          <p className="text-xs text-text-muted">
            Deals blocked on validation, stakeholder coverage, or approval
          </p>
        </div>
        <span className="rounded-full bg-chamber-build/15 px-3 py-1 text-xs font-medium text-chamber-build">
          Deals
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {MOCK_CRM_DEAL_REVIEW.map((item) => (
            <button
              key={item.id}
              className={`block w-full rounded-lg border p-4 text-left transition-colors ${
                selectedDeal.id === item.id
                  ? "border-accent-primary bg-surface-raised"
                  : "border-surface-border bg-surface-raised hover:bg-surface-overlay"
              }`}
              onClick={() => setSelectedDealId(item.id)}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {item.deal}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {item.account} · {item.stage} · {item.owner}
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-medium text-amber-300">
                  Needs review
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{item.blocker}</p>
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Review Detail
          </div>
          <div className="mt-3 text-base font-semibold text-text-primary">
            {selectedDeal.deal}
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            {selectedDeal.account} · {selectedDeal.stage} · {selectedDeal.owner}
          </div>
          <div className="mt-4 rounded-lg border border-surface-border bg-surface-overlay p-3 text-sm text-text-secondary">
            {selectedDeal.blocker}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setStatusNote(
                  `Assigned stakeholder review for ${selectedDeal.deal}.`,
                )
              }
            >
              Assign Review
            </button>
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setStatusNote(
                  `Opened blocker resolution workflow for ${selectedDeal.deal}.`,
                )
              }
            >
              Resolve Blocker
            </button>
          </div>
          <div className="mt-3 text-xs text-text-muted">{statusNote}</div>
        </div>
      </div>
    </div>
  );
}
