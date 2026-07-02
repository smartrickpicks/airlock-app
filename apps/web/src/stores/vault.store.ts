import { create } from "zustand";
import { ApiError, apiFetch } from "@/lib/api";
import { MOCK_VAULTS } from "@/lib/mock-vaults";
import { mergeDemoVaults } from "@/stores/demo-lifecycle.store";
import { getWorkspaceMode } from "@/stores/onboarding.store";

type VaultLevel = 1 | 2 | 3 | 4;
type Chamber = "discover" | "build" | "review" | "ship";
type GroupingMode = "chamber" | "entity" | "status" | "lifecycle";

interface Vault {
  id: string;
  workspace_id: string;
  parent_vault_id: string | null;
  vault_level: VaultLevel;
  name: string;
  slug: string;
  vault_type: string;
  module_type: string | null;
  chamber: Chamber | null;
  gate: string | null;
  metadata: Record<string, unknown>;
  health_score: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface VaultListResponse {
  vaults: Vault[];
  total: number;
}

interface ApprovalState {
  gatekeeper_approved: boolean;
  gatekeeper_approved_by: string | null;
  gatekeeper_approved_at: string | null;
  owner_approved: boolean;
  owner_approved_by: string | null;
  owner_approved_at: string | null;
}

interface VaultState {
  /** List of vaults for current view */
  vaults: Vault[];
  /** Currently selected vault detail */
  selectedVault: Vault | null;
  /** Children of currently selected vault */
  children: Vault[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Active grouping mode for SubPanel sidebar */
  groupingMode: GroupingMode;
  /** Current approval state for selected vault */
  approvalState: ApprovalState | null;
  /** Error from last advance attempt (e.g. unmet requirements) */
  advanceError: { message: string; unmet_requirements: string[] } | null;

  /** Fetch vaults with optional filters */
  fetchVaults: (params?: {
    module_type?: string;
    vault_level?: number;
    chamber?: string;
    parent_vault_id?: string;
  }) => Promise<void>;
  /** Fetch a single vault by ID */
  fetchVault: (vaultId: string) => Promise<void>;
  /** Fetch children of a vault */
  fetchChildren: (vaultId: string) => Promise<void>;
  /** Create a new vault */
  createVault: (data: {
    name: string;
    vault_type: string;
    vault_level?: number;
    parent_vault_id?: string | null;
    module_type?: string | null;
    metadata?: Record<string, unknown>;
  }) => Promise<Vault>;
  /** Advance vault to next chamber */
  advanceChamber: (vaultId: string) => Promise<void>;
  /** Approve a vault (POST to approval endpoint, mock fallback) */
  approveVault: (vaultId: string) => Promise<void>;
  /** Fetch approval state for a vault (GET, mock fallback) */
  fetchApprovals: (vaultId: string) => Promise<void>;
  /** Clear advance error */
  clearAdvanceError: () => void;
  /** Archive a vault */
  archiveVault: (vaultId: string) => Promise<void>;
  /** Add a vault to the local list (for mock/offline intake) */
  addVault: (vault: Vault) => void;
  /** Clear selected vault */
  clearSelectedVault: () => void;
  /** Set grouping mode for SubPanel sidebar */
  setGroupingMode: (mode: GroupingMode) => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaults: [],
  selectedVault: null,
  children: [],
  isLoading: false,
  error: null,
  groupingMode: "chamber",
  approvalState: null,
  advanceError: null,

  fetchVaults: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params?.module_type) query.set("module_type", params.module_type);
      if (params?.vault_level)
        query.set("vault_level", String(params.vault_level));
      if (params?.chamber) query.set("chamber", params.chamber);
      if (params?.parent_vault_id)
        query.set("parent_vault_id", params.parent_vault_id);

      const qs = query.toString();
      const data = await apiFetch<VaultListResponse>(
        `/api/v1/vaults${qs ? `?${qs}` : ""}`,
      );
      set({ vaults: mergeDemoVaults(data.vaults), isLoading: false });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ vaults: [], isLoading: false, error: null });
      } else {
        // API not running — use mock data for dev preview
        let filtered = mergeDemoVaults(MOCK_VAULTS as Vault[]);
        if (params?.module_type)
          filtered = filtered.filter(
            (v) => v.module_type === params.module_type,
          );
        if (params?.vault_level)
          filtered = filtered.filter(
            (v) => v.vault_level === params.vault_level,
          );
        if (params?.chamber)
          filtered = filtered.filter((v) => v.chamber === params.chamber);
        if (params?.parent_vault_id)
          filtered = filtered.filter(
            (v) => v.parent_vault_id === params.parent_vault_id,
          );
        set({ vaults: filtered, isLoading: false, error: null });
      }
    }
  },

  fetchVault: async (vaultId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<Vault>(`/api/v1/vaults/${vaultId}`);
      set({ selectedVault: data, isLoading: false });
    } catch {
      // Always check locally-created vaults first (e.g. from intake)
      const local =
        get().vaults.find((v) => v.id === vaultId || v.slug === vaultId) ??
        null;
      if (local) {
        set({ selectedVault: local, isLoading: false, error: null });
        return;
      }
      if (getWorkspaceMode() === "clean") {
        set({
          selectedVault: null,
          isLoading: false,
          error: "Vault not found",
        });
      } else {
        const mock =
          mergeDemoVaults(MOCK_VAULTS as Vault[]).find(
            (v) => v.id === vaultId || v.slug === vaultId,
          ) ?? null;
        set({
          selectedVault: mock,
          isLoading: false,
          error: mock ? null : "Vault not found",
        });
      }
    }
  },

  fetchChildren: async (vaultId) => {
    try {
      const data = await apiFetch<VaultListResponse>(
        `/api/v1/vaults/${vaultId}/children`,
      );
      set({ children: data.vaults });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to fetch children",
      });
    }
  },

  createVault: async (data) => {
    const vault = await apiFetch<Vault>("/api/v1/vaults", {
      method: "POST",
      body: JSON.stringify(data),
    });
    set((state) => ({ vaults: [vault, ...state.vaults] }));
    return vault;
  },

  advanceChamber: async (vaultId) => {
    set({ advanceError: null });
    try {
      const updated = await apiFetch<Vault>(
        `/api/v1/vaults/${vaultId}/advance`,
        { method: "POST" },
      );
      set((state) => ({
        vaults: state.vaults.map((v) => (v.id === vaultId ? updated : v)),
        selectedVault:
          state.selectedVault?.id === vaultId ? updated : state.selectedVault,
        approvalState: null,
      }));
    } catch (e) {
      // Check for 422 gate rule failure
      if (
        e instanceof ApiError &&
        e.status === 422 &&
        typeof e.details === "object" &&
        e.details &&
        "detail" in e.details
      ) {
        const detail = (
          e.details as {
            detail: { message: string; unmet_requirements: string[] };
          }
        ).detail;
        set({
          advanceError: {
            message: detail.message ?? "Cannot advance vault",
            unmet_requirements: detail.unmet_requirements ?? [],
          },
        });
        return;
      }
      // Mock fallback — advance chamber locally
      const CHAMBER_ORDER: Chamber[] = ["discover", "build", "review", "ship"];
      const vault =
        get().vaults.find((v) => v.id === vaultId) ?? get().selectedVault;
      if (!vault || !vault.chamber) return;
      const currentIdx = CHAMBER_ORDER.indexOf(vault.chamber);
      if (currentIdx < 0 || currentIdx >= CHAMBER_ORDER.length - 1) return;
      const nextChamber = CHAMBER_ORDER[currentIdx + 1];
      const updated: Vault = {
        ...vault,
        chamber: nextChamber,
        updated_at: new Date().toISOString(),
      };
      set((state) => ({
        vaults: state.vaults.map((v) => (v.id === vaultId ? updated : v)),
        selectedVault:
          state.selectedVault?.id === vaultId ? updated : state.selectedVault,
        approvalState: null,
      }));
    }
  },

  approveVault: async (vaultId) => {
    try {
      await apiFetch(`/api/v1/vaults/${vaultId}/approve`, {
        method: "POST",
      });
      // Re-fetch approval state after recording
      await get().fetchApprovals(vaultId);
    } catch {
      // Mock fallback — toggle gatekeeper then owner
      set((state) => {
        const current = state.approvalState ?? {
          gatekeeper_approved: false,
          gatekeeper_approved_by: null,
          gatekeeper_approved_at: null,
          owner_approved: false,
          owner_approved_by: null,
          owner_approved_at: null,
        };
        // If gatekeeper not yet approved, approve as gatekeeper; else approve as owner
        if (!current.gatekeeper_approved) {
          return {
            approvalState: {
              ...current,
              gatekeeper_approved: true,
              gatekeeper_approved_by: "mock-user",
              gatekeeper_approved_at: new Date().toISOString(),
            },
          };
        }
        return {
          approvalState: {
            ...current,
            owner_approved: true,
            owner_approved_by: "mock-user",
            owner_approved_at: new Date().toISOString(),
          },
        };
      });
    }
  },

  fetchApprovals: async (vaultId) => {
    try {
      const state = await apiFetch<ApprovalState>(
        `/api/v1/vaults/${vaultId}/approvals`,
      );
      set({ approvalState: state });
    } catch {
      // Mock fallback — default empty approvals
      set({
        approvalState: {
          gatekeeper_approved: false,
          gatekeeper_approved_by: null,
          gatekeeper_approved_at: null,
          owner_approved: false,
          owner_approved_by: null,
          owner_approved_at: null,
        },
      });
    }
  },

  clearAdvanceError: () => set({ advanceError: null }),

  archiveVault: async (vaultId) => {
    await apiFetch(`/api/v1/vaults/${vaultId}/archive`, { method: "POST" });
    set((state) => ({
      vaults: state.vaults.filter((v) => v.id !== vaultId),
      selectedVault:
        state.selectedVault?.id === vaultId ? null : state.selectedVault,
    }));
  },

  addVault: (vault) => set((state) => ({ vaults: [vault, ...state.vaults] })),

  clearSelectedVault: () => set({ selectedVault: null, children: [] }),

  setGroupingMode: (mode) => set({ groupingMode: mode }),
}));

export type { Vault, VaultLevel, Chamber, GroupingMode, ApprovalState };
