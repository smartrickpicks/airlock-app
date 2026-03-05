import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { MOCK_EXTRACTIONS, type VaultExtraction } from "@/lib/mock-extractions";

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
      const data = await apiFetch<VaultExtraction>(
        `/api/v1/extractions/${vaultId}`,
      );
      set({ extraction: data, isLoading: false });
    } catch {
      const mock = MOCK_EXTRACTIONS[vaultId] ?? null;
      set({ extraction: mock, isLoading: false, error: null });
    }
  },

  toggleHeatmap: () =>
    set((state) => ({ heatmapEnabled: !state.heatmapEnabled })),

  clearExtraction: () =>
    set({ extraction: null, isLoading: false, error: null }),
}));
