"use client";

import PatchStateBadge from "@/components/atoms/PatchStateBadge";
import type { Patch } from "@/lib/mock-patches";

interface PatchListProps {
  patches: Patch[];
  selectedPatchId: string | null;
  onSelect: (patchId: string) => void;
  className?: string;
}

export default function PatchList({
  patches,
  selectedPatchId,
  onSelect,
  className,
}: PatchListProps) {
  if (patches.length === 0) {
    return (
      <div
        className={`flex items-center justify-center p-6 ${className ?? ""}`}
      >
        <p className="text-sm text-text-muted">No patches for this vault.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      {patches.map((patch) => {
        const isSelected = patch.id === selectedPatchId;
        return (
          <button
            key={patch.id}
            onClick={() => onSelect(patch.id)}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-fast ${
              isSelected
                ? "bg-accent-primary/10 border border-accent-primary/30"
                : "hover:bg-surface-overlay border border-transparent"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-text-primary">
                  {patch.field_name}
                </span>
                <PatchStateBadge state={patch.state} />
              </div>
              <p className="mt-0.5 truncate text-xs text-text-muted">
                {patch.current_value} &rarr; {patch.proposed_value}
              </p>
            </div>
            <span className="flex-shrink-0 text-[10px] text-text-muted">
              {patch.author_name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
