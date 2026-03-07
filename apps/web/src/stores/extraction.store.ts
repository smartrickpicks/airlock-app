import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  getContractEngineInput,
  runExtractionEngine,
  transformExtractionResults,
} from "@/lib/contract-engines";
import {
  FALLBACK_EXTRACTION,
  MOCK_EXTRACTIONS,
  type VaultExtraction,
} from "@/lib/mock-extractions";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface ExtractionState {
  extraction: VaultExtraction | null;
  isLoading: boolean;
  error: string | null;
  heatmapEnabled: boolean;

  fetchExtraction: (vaultId: string) => Promise<void>;
  toggleHeatmap: () => void;
  clearExtraction: () => void;
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  extraction: null,
  isLoading: false,
  error: null,
  heatmapEnabled: false,

  fetchExtraction: async (vaultId) => {
    set({ isLoading: true, error: null });
    try {
      const vault = await apiFetch<{
        id: string;
        metadata: Record<string, unknown>;
      }>(`/api/v1/vaults/${vaultId}`);
      const extractionResult = vault.metadata?.extraction_result as
        | { results?: Record<string, unknown> }
        | undefined;
      if (extractionResult?.results) {
        set({
          extraction: transformExtractionResults(
            vaultId,
            extractionResult.results as Parameters<
              typeof transformExtractionResults
            >[1],
          ),
          isLoading: false,
        });
        return;
      }

      const input = getContractEngineInput(vaultId);
      if (!input) {
        throw new Error("No engine input available");
      }
      const data = await runExtractionEngine(input);
      set({
        extraction: transformExtractionResults(vaultId, data.results),
        isLoading: false,
      });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ extraction: null, isLoading: false, error: null });
      } else {
        const mock =
          MOCK_EXTRACTIONS[vaultId] ??
          (vaultId.startsWith("vault_")
            ? {
                ...FALLBACK_EXTRACTION,
                vault_id: vaultId,
              }
            : null);
        set({ extraction: mock, isLoading: false, error: null });
      }
    }
  },

  toggleHeatmap: () =>
    set((state) => ({ heatmapEnabled: !state.heatmapEnabled })),

  clearExtraction: () =>
    set({ extraction: null, isLoading: false, error: null }),
}));
