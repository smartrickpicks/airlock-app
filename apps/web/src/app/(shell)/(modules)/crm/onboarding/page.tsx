"use client";

import { useMemo, useState } from "react";
import { MOCK_CRM_ONBOARDING } from "@/lib/mock-crm-enhancements";

export default function CrmOnboardingPage() {
  const [selectedCardId, setSelectedCardId] = useState(
    MOCK_CRM_ONBOARDING[0]?.id,
  );
  const [selectedStepId, setSelectedStepId] = useState(
    MOCK_CRM_ONBOARDING[0]?.steps[0]?.id,
  );
  const [statusNote, setStatusNote] = useState(
    "Select a step to inspect ownership and kickoff readiness.",
  );
  const selectedCard = useMemo(
    () =>
      MOCK_CRM_ONBOARDING.find((card) => card.id === selectedCardId) ??
      MOCK_CRM_ONBOARDING[0],
    [selectedCardId],
  );
  const selectedStep =
    selectedCard.steps.find((step) => step.id === selectedStepId) ??
    selectedCard.steps[0];

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Onboarding
          </h1>
          <p className="text-xs text-text-muted">
            Customer launch progress, provisioning, and kickoff readiness
          </p>
        </div>
        <span className="rounded-full bg-chamber-ship/15 px-3 py-1 text-xs font-medium text-chamber-ship">
          Customers
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {MOCK_CRM_ONBOARDING.map((card) => (
            <button
              key={card.id}
              className={`block w-full rounded-lg border p-5 text-left transition-colors ${
                selectedCard.id === card.id
                  ? "border-accent-primary bg-surface-raised"
                  : "border-surface-border bg-surface-raised hover:bg-surface-overlay"
              }`}
              onClick={() => {
                setSelectedCardId(card.id);
                setSelectedStepId(card.steps[0]?.id);
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-text-primary">
                    {card.accountName}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    Onboarding started {card.startedAt}
                  </div>
                </div>
                <div className="text-sm text-text-secondary">
                  {card.progressPercent}% complete
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-surface-overlay">
                <div
                  className="h-2 rounded-full bg-chamber-ship"
                  style={{ width: `${card.progressPercent}%` }}
                />
              </div>
              <div className="mt-4 space-y-2">
                {card.steps.map((step) => (
                  <div
                    key={step.id}
                    className={`rounded-lg border p-3 ${
                      selectedCard.id === card.id && selectedStep.id === step.id
                        ? "border-accent-primary bg-surface-raised"
                        : "border-surface-border bg-surface-overlay"
                    }`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedCardId(card.id);
                      setSelectedStepId(step.id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-text-primary">
                        {step.done ? "[x]" : "[ ]"} {step.label}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {step.owner} · {step.dueLabel}
                      </div>
                    </div>
                    {step.detail ? (
                      <div className="mt-1 text-xs text-text-secondary">
                        {step.detail}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Selected Step
          </div>
          <div className="mt-3 text-base font-semibold text-text-primary">
            {selectedCard.accountName}
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            {selectedStep.label}
          </div>
          <div className="mt-4 space-y-3">
            <DetailCard label="Owner" value={selectedStep.owner} />
            <DetailCard label="Due" value={selectedStep.dueLabel} />
            <DetailCard
              label="Status"
              value={selectedStep.done ? "Complete" : "Open"}
            />
          </div>
          {selectedStep.detail ? (
            <div className="mt-4 rounded-lg border border-surface-border bg-surface-overlay p-3 text-sm text-text-secondary">
              {selectedStep.detail}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setStatusNote(`Assigned ${selectedStep.label} to Ana Chen.`)
              }
            >
              Assign Owner
            </button>
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setStatusNote(
                  `Queued kickoff follow-up for ${selectedCard.accountName}.`,
                )
              }
            >
              Queue Follow-Up
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
