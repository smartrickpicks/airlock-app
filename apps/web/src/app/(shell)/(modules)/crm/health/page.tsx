"use client";

import { useState } from "react";
import { MOCK_CRM_HEALTH } from "@/lib/mock-crm-enhancements";

export default function CrmHealthPage() {
  const [selectedCardId, setSelectedCardId] = useState(
    MOCK_CRM_HEALTH[1]?.id ?? MOCK_CRM_HEALTH[0]?.id,
  );
  const selectedCard =
    MOCK_CRM_HEALTH.find((card) => card.id === selectedCardId) ??
    MOCK_CRM_HEALTH[0];

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Health Monitor
          </h1>
          <p className="text-xs text-text-muted">
            Customer health, risk factors, and recommended recovery actions
          </p>
        </div>
        <span className="rounded-full bg-chamber-ship/15 px-3 py-1 text-xs font-medium text-chamber-ship">
          Customers
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="grid gap-4 md:grid-cols-2">
          {MOCK_CRM_HEALTH.map((card) => (
            <button
              key={card.id}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selectedCard.id === card.id
                  ? "border-accent-primary bg-surface-raised"
                  : "border-surface-border bg-surface-raised hover:bg-surface-overlay"
              }`}
              onClick={() => setSelectedCardId(card.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {card.accountName}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    Last contact {card.lastContact}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-text-primary">
                    {card.healthScore}
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {card.trend > 0 ? `+${card.trend}` : card.trend}
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-surface-overlay">
                <div
                  className="h-2 rounded-full bg-accent-primary"
                  style={{ width: `${card.healthScore}%` }}
                />
              </div>
              <div className="mt-4 space-y-2 text-xs text-text-secondary">
                {card.riskFactors.map((factor) => (
                  <div key={factor}>- {factor}</div>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Selected Detail
          </div>
          <div className="mt-3">
            <div className="text-base font-semibold text-text-primary">
              {selectedCard.accountName}
            </div>
            <div className="mt-1 text-sm text-text-secondary">
              Health {selectedCard.healthScore} ({selectedCard.trend})
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Risk Factors
              </div>
              <div className="mt-2 space-y-2 text-sm text-text-secondary">
                {MOCK_CRM_HEALTH[1].riskFactors.map((factor) => (
                  <div key={factor}>- {factor}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Recommended Actions
              </div>
              <div className="mt-2 space-y-2 text-sm text-text-secondary">
                {selectedCard.recommendedActions.map((action) => (
                  <div key={action}>- {action}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
