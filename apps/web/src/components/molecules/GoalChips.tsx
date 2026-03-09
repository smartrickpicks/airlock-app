"use client";

import type { GoalChip } from "@/lib/mock-forge";

interface GoalChipsProps {
  chips: GoalChip[];
  onSelect: (chipId: string) => void;
  selectedId?: string | null;
}

export default function GoalChips({
  chips,
  onSelect,
  selectedId,
}: GoalChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {chips.map((chip) => {
        const isSelected = selectedId === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onSelect(chip.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              isSelected
                ? "bg-accent-primary text-text-inverse"
                : "border border-surface-border bg-surface-overlay text-text-secondary hover:border-accent-primary/50 hover:text-text-primary"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
