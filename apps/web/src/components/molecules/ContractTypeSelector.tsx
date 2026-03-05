"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  CONTRACT_TYPES,
  VERTICAL_LABELS,
  type ContractVertical,
} from "@/lib/mock-clauses";

interface ContractTypeSelectorProps {
  selectedType: string | null;
  onSelect: (typeId: string) => void;
}

const VERTICALS: ContractVertical[] = [
  "music_core",
  "music_ancillary",
  "film",
  "tv",
  "cross_entertainment",
];

export default function ContractTypeSelector({
  selectedType,
  onSelect,
}: ContractTypeSelectorProps) {
  const [expandedVerticals, setExpandedVerticals] = useState<
    Set<ContractVertical>
  >(new Set<ContractVertical>(["music_core"]));

  const toggleVertical = (v: ContractVertical) => {
    setExpandedVerticals((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Select Contract Type
      </h3>
      {VERTICALS.map((vertical) => {
        const types = CONTRACT_TYPES.filter((t) => t.vertical === vertical);
        const isExpanded = expandedVerticals.has(vertical);

        return (
          <div key={vertical}>
            <button
              onClick={() => toggleVertical(vertical)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-text-secondary hover:bg-surface-overlay"
            >
              {isExpanded ? (
                <ChevronDown size={12} className="text-text-muted" />
              ) : (
                <ChevronRight size={12} className="text-text-muted" />
              )}
              {VERTICAL_LABELS[vertical]}
              <span className="ml-auto text-[10px] text-text-muted">
                {types.length}
              </span>
            </button>

            {isExpanded && (
              <div className="ml-4 flex flex-col gap-0.5 py-1">
                {types.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => onSelect(type.id)}
                    className={`w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-sm transition-colors duration-fast ${
                      selectedType === type.id
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "text-text-primary hover:bg-surface-overlay"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
