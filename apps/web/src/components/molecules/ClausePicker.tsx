"use client";

import { type Clause, type RiskLevel } from "@/lib/mock-clauses";

const riskStyles: Record<RiskLevel, string> = {
  standard: "",
  elevated: "bg-gate-amber/20 text-gate-amber",
  critical: "bg-gate-red/20 text-gate-red",
  high: "bg-gate-red/20 text-gate-red animate-pulse",
};

interface ClausePickerProps {
  clauses: Clause[];
  selectedClauseId: string | null;
  onSelect: (clauseId: string) => void;
  className?: string;
}

export default function ClausePicker({
  clauses,
  selectedClauseId,
  onSelect,
  className,
}: ClausePickerProps) {
  if (clauses.length === 0) {
    return (
      <p className={`text-xs text-text-muted ${className ?? ""}`}>
        No clauses available for this section.
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        Available Clauses
      </h4>
      {clauses.map((clause) => {
        const isSelected = clause.clause_id === selectedClauseId;
        return (
          <button
            key={clause.clause_id}
            onClick={() => onSelect(clause.clause_id)}
            className={`w-full cursor-pointer rounded-md border px-3 py-2 text-left transition-colors duration-fast ${
              isSelected
                ? "border-accent-primary/30 bg-accent-primary/10"
                : "border-surface-border hover:bg-surface-overlay"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-text-muted">
                {clause.clause_id}
              </span>
              {clause.risk_level !== "standard" && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${riskStyles[clause.risk_level]}`}
                >
                  {clause.risk_level}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {clause.clause_type.replace(/_/g, " ")}
            </p>
            <p className="mt-0.5 text-[10px] text-text-muted">
              {clause.variables.length} variable
              {clause.variables.length !== 1 ? "s" : ""}
            </p>
          </button>
        );
      })}
    </div>
  );
}
