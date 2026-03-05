"use client";

import ContractTypeSelector from "@/components/molecules/ContractTypeSelector";
import SectionWizard from "@/components/organisms/SectionWizard";
import ContractPreview from "@/components/organisms/ContractPreview";
import { useGeneratorStore } from "@/stores/generator.store";

export default function GeneratorPage() {
  const { contractType, template, selectContractType, reset } =
    useGeneratorStore();

  return (
    <div className="flex h-full">
      {/* Builder pane (left) */}
      <div className="flex w-1/2 flex-col border-r border-surface-border">
        {/* Builder header */}
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Contract Builder
          </span>
          {template && (
            <button
              onClick={reset}
              className="cursor-pointer text-xs text-text-muted transition-colors hover:text-text-secondary"
            >
              Start Over
            </button>
          )}
        </div>

        {/* Builder content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!template ? (
            <ContractTypeSelector
              selectedType={contractType}
              onSelect={selectContractType}
            />
          ) : (
            <SectionWizard />
          )}
        </div>
      </div>

      {/* Preview pane (right) */}
      <div className="flex w-1/2 flex-col bg-surface-sunken">
        <ContractPreview />
      </div>
    </div>
  );
}
