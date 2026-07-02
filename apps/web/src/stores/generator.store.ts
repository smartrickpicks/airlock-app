import { create } from "zustand";
import { runGenerationEngine } from "@/lib/contract-engines";
import {
  MOCK_TEMPLATES,
  getClausesForSection,
  type ContractTemplate,
} from "@/lib/mock-clauses";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface GeneratorState {
  /** Selected contract type ID */
  contractType: string | null;
  /** Active template */
  template: ContractTemplate | null;
  /** Current wizard step index (0-based) */
  currentStep: number;
  /** Field values: { CHECK_CODE: userValue } */
  fieldValues: Record<string, string>;
  /** Clause overrides: { sectionId: clauseId } */
  clauseOverrides: Record<string, string>;
  /** Assembled preview markdown */
  preview: string;
  /** Engine request state */
  isGenerating: boolean;
  generationError: string | null;
  previewSource: "local" | "engine";

  /** Select a contract type and load its template */
  selectContractType: (typeId: string) => void;
  /** Move to next wizard step */
  nextStep: () => void;
  /** Move to previous wizard step */
  prevStep: () => void;
  /** Jump to a specific step */
  goToStep: (step: number) => void;
  /** Set a field value */
  setFieldValue: (field: string, value: string) => void;
  /** Override a clause for a section */
  overrideClause: (sectionId: string, clauseId: string) => void;
  /** Assemble the preview from current state */
  assemblePreview: () => void;
  /** Generate using backend engine */
  generateWithEngine: () => Promise<void>;
  /** Reset the generator */
  reset: () => void;
}

function interpolate(
  body: string,
  values: Record<string, string>,
  fallback: string,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_match, field: string) => {
    return values[field] || fallback;
  });
}

function assemble(
  template: ContractTemplate,
  fieldValues: Record<string, string>,
  clauseOverrides: Record<string, string>,
): string {
  const lines: string[] = [];
  lines.push(`# ${template.display_name}\n`);

  for (const section of template.sections) {
    lines.push(`## ${section.title}\n`);

    // Find the clause for this section
    const overrideId = clauseOverrides[section.id];
    const candidates = getClausesForSection(section.id, template.contract_type);
    const clause = overrideId
      ? (candidates.find((c) => c.clause_id === overrideId) ?? candidates[0])
      : candidates.sort(
          (a, b) => b.generation_config.priority - a.generation_config.priority,
        )[0];

    if (clause) {
      const text = interpolate(
        clause.body,
        fieldValues,
        clause.generation_config.fallback,
      );
      lines.push(text);
      lines.push(`\n*Clause: ${clause.clause_id}*\n`);
    } else {
      lines.push("*[No clause available for this section]*\n");
    }
  }

  return lines.join("\n");
}

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  contractType: null,
  template: null,
  currentStep: 0,
  fieldValues: {},
  clauseOverrides: {},
  preview: "",
  isGenerating: false,
  generationError: null,
  previewSource: "local",

  selectContractType: (typeId) => {
    if (getWorkspaceMode() === "clean") {
      set({
        contractType: typeId,
        template: null,
        currentStep: 0,
        fieldValues: {},
        clauseOverrides: {},
        preview: "",
        generationError: null,
        previewSource: "local",
      });
      return;
    }
    const template = MOCK_TEMPLATES[typeId] ?? null;
    set({
      contractType: typeId,
      template,
      currentStep: 0,
      fieldValues: {},
      clauseOverrides: {},
      preview: "",
      generationError: null,
      previewSource: "local",
    });
    if (template) {
      // Auto-assemble initial preview
      const state = get();
      set({
        preview: assemble(template, state.fieldValues, state.clauseOverrides),
        previewSource: "local",
      });
    }
  },

  nextStep: () => {
    const { currentStep, template } = get();
    if (template && currentStep < template.sections.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  goToStep: (step) => set({ currentStep: step }),

  setFieldValue: (field, value) => {
    const newValues = { ...get().fieldValues, [field]: value };
    const { template, clauseOverrides } = get();
    set({ fieldValues: newValues });
    if (template) {
      set({
        preview: assemble(template, newValues, clauseOverrides),
        previewSource: "local",
        generationError: null,
      });
    }
  },

  overrideClause: (sectionId, clauseId) => {
    const newOverrides = { ...get().clauseOverrides, [sectionId]: clauseId };
    const { template, fieldValues } = get();
    set({ clauseOverrides: newOverrides });
    if (template) {
      set({
        preview: assemble(template, fieldValues, newOverrides),
        previewSource: "local",
        generationError: null,
      });
    }
  },

  assemblePreview: () => {
    const { template, fieldValues, clauseOverrides } = get();
    if (template) {
      set({
        preview: assemble(template, fieldValues, clauseOverrides),
        previewSource: "local",
        generationError: null,
      });
    }
  },

  generateWithEngine: async () => {
    const { contractType, fieldValues, preview } = get();
    if (!contractType) return;

    set({ isGenerating: true, generationError: null });
    try {
      const data = await runGenerationEngine({
        contractType,
        formValues: fieldValues,
        seed: 42,
      });
      set({
        preview: data.text || preview,
        isGenerating: false,
        previewSource: "engine",
      });
    } catch (error) {
      set({
        isGenerating: false,
        generationError:
          error instanceof Error ? error.message : "Engine generation failed",
      });
    }
  },

  reset: () =>
    set({
      contractType: null,
      template: null,
      currentStep: 0,
      fieldValues: {},
      clauseOverrides: {},
      preview: "",
      isGenerating: false,
      generationError: null,
      previewSource: "local",
    }),
}));
