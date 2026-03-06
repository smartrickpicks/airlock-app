"use client";

import { CheckCircle2, Circle, X, Sparkles } from "lucide-react";
import { useOnboardingStore } from "@/stores/onboarding.store";

export default function OnboardingChecklist() {
  const {
    userChecklist,
    checklistDismissed,
    dismissChecklist,
    userChecklistProgress,
    isOnboardingComplete,
  } = useOnboardingStore();

  const { completed, total } = userChecklistProgress();

  if (checklistDismissed) return null;

  const allDone = isOnboardingComplete();

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          {allDone ? (
            <Sparkles size={16} className="text-accent-success" />
          ) : (
            <span className="text-sm font-semibold text-text-primary">
              Getting Started
            </span>
          )}
          {allDone ? (
            <span className="text-sm font-semibold text-accent-success">
              All done!
            </span>
          ) : (
            <span className="text-xs text-text-muted">
              {completed} / {total}
            </span>
          )}
        </div>
        <button
          onClick={dismissChecklist}
          className="rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          title="Dismiss checklist"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="h-1.5 rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-accent-primary transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="p-4">
        <ul className="space-y-2">
          {userChecklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5">
              {item.completed ? (
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-accent-success"
                />
              ) : (
                <Circle size={16} className="shrink-0 text-text-muted" />
              )}
              <span
                className={`text-sm ${
                  item.completed
                    ? "text-text-muted line-through"
                    : "text-text-primary"
                }`}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
