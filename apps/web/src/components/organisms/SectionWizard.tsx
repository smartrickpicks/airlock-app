"use client";

import { getClausesForSection } from "@/lib/mock-clauses";
import ClausePicker from "@/components/molecules/ClausePicker";
import { useGeneratorStore } from "@/stores/generator.store";

export default function SectionWizard() {
  const {
    template,
    currentStep,
    fieldValues,
    clauseOverrides,
    nextStep,
    prevStep,
    goToStep,
    setFieldValue,
    overrideClause,
  } = useGeneratorStore();

  if (!template) return null;

  const section = template.sections[currentStep];
  const clauses = getClausesForSection(section.id, template.contract_type);
  const selectedClauseId =
    clauseOverrides[section.id] ?? clauses[0]?.clause_id ?? null;
  const activeClause =
    clauses.find((c) => c.clause_id === selectedClauseId) ?? clauses[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Step navigation bar */}
      <div className="flex gap-1 overflow-x-auto">
        {template.sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goToStep(i)}
            className={`flex-shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-fast ${
              i === currentStep
                ? "bg-accent-primary/20 text-accent-primary"
                : i < currentStep
                  ? "bg-gate-green/10 text-gate-green"
                  : "text-text-muted hover:bg-surface-overlay hover:text-text-secondary"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          {section.title}
        </h3>
        <p className="text-xs text-text-muted">
          {section.type === "boilerplate"
            ? "Boilerplate section"
            : "Conditional section"}{" "}
          — Step {currentStep + 1} of {template.sections.length}
        </p>
      </div>

      {/* Field inputs for active clause variables */}
      {activeClause && activeClause.variables.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Fields
          </h4>
          {activeClause.variables.map((v) => (
            <div key={v.field}>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {v.field.replace(/^(OPP_|ACCT_)/, "").replace(/_/g, " ")}
              </label>
              <input
                type="text"
                value={fieldValues[v.field] ?? ""}
                onChange={(e) => setFieldValue(v.field, e.target.value)}
                placeholder={v.default ?? v.placeholder}
                className="w-full rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* Clause picker (conditional sections only) */}
      {section.type === "conditional" && clauses.length > 1 && (
        <ClausePicker
          clauses={clauses}
          selectedClauseId={selectedClauseId}
          onSelect={(id) => overrideClause(section.id, id)}
          className="mt-2"
        />
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={nextStep}
          disabled={currentStep === template.sections.length - 1}
          className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {currentStep === template.sections.length - 1 ? "Complete" : "Next"}
        </button>
      </div>
    </div>
  );
}
