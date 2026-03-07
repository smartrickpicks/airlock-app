import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { MOCK_EVENTS } from "@/lib/mock-events";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface VaultEvent {
  id: string;
  vault_id: string;
  workspace_id: string;
  event_type: string;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

interface EventListResponse {
  events: VaultEvent[];
  total: number;
}

interface EventState {
  events: VaultEvent[];
  isLoading: boolean;
  error: string | null;

  /** Fetch events for a specific vault */
  fetchVaultEvents: (vaultId: string) => Promise<void>;
  /** Fetch recent events across the workspace */
  fetchRecentEvents: () => Promise<void>;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  isLoading: false,
  error: null,

  fetchVaultEvents: async (vaultId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<EventListResponse>(
        `/api/v1/events/vault/${vaultId}`,
      );
      set({ events: data.events, isLoading: false });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ events: [], isLoading: false, error: null });
      } else {
        // API not running — use mock data for dev preview
        const filtered = (MOCK_EVENTS as VaultEvent[]).filter(
          (e) => e.vault_id === vaultId,
        );
        set({ events: filtered, isLoading: false, error: null });
      }
    }
  },

  fetchRecentEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<EventListResponse>("/api/v1/events/recent");
      set({ events: data.events, isLoading: false });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ events: [], isLoading: false, error: null });
      } else {
        // API not running — use mock data for dev preview
        set({
          events: MOCK_EVENTS as VaultEvent[],
          isLoading: false,
          error: null,
        });
      }
    }
  },
}));

export type { VaultEvent };
