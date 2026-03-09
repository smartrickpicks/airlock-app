"use client";

import type { AutonomyOption } from "@/lib/mock-forge";

interface AutonomyCardsProps {
  options: AutonomyOption[];
  onSelect: (optionId: string) => void;
  selectedId?: string | null;
}

export default function AutonomyCards({
  options,
  onSelect,
  selectedId,
}: AutonomyCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2">
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
              isSelected
                ? "border-accent-primary bg-accent-primary/10"
                : "border-surface-border bg-surface-overlay hover:border-accent-primary/40 hover:bg-surface-overlay/80"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{option.emoji}</span>
              <span
                className={`text-xs font-semibold ${
                  isSelected ? "text-accent-primary" : "text-text-primary"
                }`}
              >
                {option.label}
              </span>
            </div>
            <p className="text-[11px] leading-tight text-text-muted">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
