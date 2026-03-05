import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_CRM_ACCOUNTS,
  MOCK_CRM_DEALS,
  MOCK_CRM_LEADS,
  type CrmAccount,
  type CrmDeal,
  type CrmLead,
  type PipelineStage,
} from "@/lib/mock-crm";

interface CrmState {
  accounts: CrmAccount[];
  deals: CrmDeal[];
  leads: CrmLead[];
  isLoading: boolean;
  error: string | null;
  fetchCrmData: () => Promise<void>;
  moveDeal: (dealId: string, newStage: PipelineStage) => void;
}

export const useCrmStore = create<CrmState>((set) => ({
  accounts: [],
  deals: [],
  leads: [],
  isLoading: false,
  error: null,

  fetchCrmData: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{
        accounts: CrmAccount[];
        deals: CrmDeal[];
        leads: CrmLead[];
      }>("/api/v1/crm");
      set({
        accounts: data.accounts,
        deals: data.deals,
        leads: data.leads,
        isLoading: false,
      });
    } catch {
      // API not running — use mock data for dev preview
      set({
        accounts: MOCK_CRM_ACCOUNTS,
        deals: MOCK_CRM_DEALS,
        leads: MOCK_CRM_LEADS,
        isLoading: false,
        error: null,
      });
    }
  },

  moveDeal: (dealId, newStage) =>
    set((state) => ({
      deals: state.deals.map((d) =>
        d.id === dealId ? { ...d, stage: newStage, daysInStage: 0 } : d,
      ),
    })),
}));
