import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_PATCHES,
  VALID_TRANSITIONS,
  type Patch,
  type PatchState,
} from "@/lib/mock-patches";

interface PatchStoreState {
  patches: Patch[];
  selectedPatch: Patch | null;
  isLoading: boolean;
  error: string | null;

  fetchPatches: (vaultId: string) => Promise<void>;
  selectPatch: (patchId: string) => void;
  clearSelectedPatch: () => void;
  createDraft: (
    vaultId: string,
    data: {
      field_name: string;
      current_value: string;
      proposed_value: string;
      intent: string;
      because_clause: string;
    },
  ) => void;
  canTransition: (patch: Patch, to: PatchState, actorId: string) => boolean;
}

export const usePatchStore = create<PatchStoreState>((set, get) => ({
  patches: [],
  selectedPatch: null,
  isLoading: false,
  error: null,

  fetchPatches: async (vaultId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<Patch[]>(`/api/v1/vaults/${vaultId}/patches`);
      set({ patches: data, isLoading: false });
    } catch {
      const mock = MOCK_PATCHES[vaultId] ?? [];
      set({ patches: mock, isLoading: false, error: null });
    }
  },

  selectPatch: (patchId) => {
    const patch = get().patches.find((p) => p.id === patchId) ?? null;
    set({ selectedPatch: patch });
  },

  clearSelectedPatch: () => set({ selectedPatch: null }),

  createDraft: (vaultId, data) => {
    const draft: Patch = {
      id: `patch_draft_${Date.now()}`,
      vault_id: vaultId,
      author_id: "current_user",
      author_name: "Current User",
      state: "draft",
      version: 1,
      ...data,
      history: [],
      approval_steps: [
        {
          id: `s_${Date.now()}_1`,
          label: "Submitted",
          status: "pending",
          actor_name: null,
          role: "author",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: `s_${Date.now()}_2`,
          label: "Verifier Review",
          status: "pending",
          actor_name: null,
          role: "verifier",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: `s_${Date.now()}_3`,
          label: "Admin Review",
          status: "pending",
          actor_name: null,
          role: "admin",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: `s_${Date.now()}_4`,
          label: "Applied",
          status: "pending",
          actor_name: null,
          role: "system",
          timestamp: null,
          sla_deadline: null,
        },
      ],
      sla_deadline: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({
      patches: [draft, ...state.patches],
      selectedPatch: draft,
    }));
  },

  canTransition: (patch, to, actorId) => {
    const transition = VALID_TRANSITIONS.find(
      (t) => t.from === patch.state && t.to === to,
    );
    if (!transition) return false;
    // Self-approval prevention
    if (
      (to === "verifier_approved" || to === "admin_approved") &&
      actorId === patch.author_id
    ) {
      return false;
    }
    return true;
  },
}));
