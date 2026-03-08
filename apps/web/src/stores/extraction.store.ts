import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  getContractEngineInput,
  runExtractionEngine,
  transformExtractionResults,
} from "@/lib/contract-engines";
import {
  FALLBACK_ENTITY_RESOLUTION,
  FALLBACK_EXTRACTION,
  MOCK_ENTITY_RESOLUTIONS,
  MOCK_EXTRACTIONS,
  type EntityResolutionSummary,
  type VaultExtraction,
} from "@/lib/mock-extractions";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface ExtractionState {
  extraction: VaultExtraction | null;
  entityResolution: EntityResolutionSummary | null;
  isLoading: boolean;
  error: string | null;
  heatmapEnabled: boolean;

  fetchExtraction: (vaultId: string) => Promise<void>;
  toggleHeatmap: () => void;
  clearExtraction: () => void;
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  extraction: null,
  entityResolution: null,
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
      // Check local vault store for extraction_result in metadata
      // (set by intake flow when creating mock vaults offline)
      const { useVaultStore } = await import("@/stores/vault.store");
      const vaultState = useVaultStore.getState();
      const localVault =
        vaultState.selectedVault?.id === vaultId ||
        vaultState.selectedVault?.slug === vaultId
          ? vaultState.selectedVault
          : vaultState.vaults.find(
              (v) => v.id === vaultId || v.slug === vaultId,
            );
      const localExtraction = localVault?.metadata?.extraction_result as
        | { results?: Record<string, unknown> }
        | undefined;
      if (localExtraction?.results) {
        set({
          extraction: transformExtractionResults(
            localVault!.id,
            localExtraction.results as Parameters<
              typeof transformExtractionResults
            >[1],
          ),
          isLoading: false,
        });
        return;
      }

      if (getWorkspaceMode() === "clean") {
        set({
          extraction: null,
          entityResolution: null,
          isLoading: false,
          error: null,
        });
      } else {
        const mock =
          MOCK_EXTRACTIONS[vaultId] ??
          (vaultId.startsWith("vault_")
            ? {
                ...FALLBACK_EXTRACTION,
                vault_id: vaultId,
              }
            : null);
        const mockER =
          MOCK_ENTITY_RESOLUTIONS[vaultId] ??
          (vaultId.startsWith("vault_") ? FALLBACK_ENTITY_RESOLUTION : null);
        set({
          extraction: mock,
          entityResolution: mockER,
          isLoading: false,
          error: null,
        });
      }
    }
  },

  toggleHeatmap: () =>
    set((state) => ({ heatmapEnabled: !state.heatmapEnabled })),

  clearExtraction: () =>
    set({
      extraction: null,
      entityResolution: null,
      isLoading: false,
      error: null,
    }),
}));
