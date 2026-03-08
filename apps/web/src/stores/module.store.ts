import { create } from "zustand";

type ModuleName = "contracts" | "crm" | "tasks" | "calendar" | "documents" | "admin";
type ChamberName = "discover" | "build" | "review" | "ship";

interface ModuleState {
  /** Currently active module */
  activeModule: ModuleName;
  /** Currently active chamber within the module */
  activeChamber: ChamberName;
  /** Currently selected vault ID (null if on list view) */
  selectedVaultId: string | null;
  /** Last-visited view path per module (for restoring position) */
  lastVisitedView: Record<ModuleName, string>;

  /** Set the active module */
  setActiveModule: (module: ModuleName) => void;
  /** Set the active chamber */
  setActiveChamber: (chamber: ChamberName) => void;
  /** Set the selected vault */
  setSelectedVault: (vaultId: string | null) => void;
  /** Record the last-visited view for a module */
  setLastVisitedView: (module: ModuleName, path: string) => void;
}

export const useModuleStore = create<ModuleState>((set) => ({
  activeModule: "contracts",
  activeChamber: "discover",
  selectedVaultId: null,
  lastVisitedView: {
    contracts: "/contracts",
    crm: "/crm",
    tasks: "/tasks",
    calendar: "/calendar",
    documents: "/documents",
    admin: "/admin",
  },

  setActiveModule: (module) =>
    set({ activeModule: module, selectedVaultId: null }),
  setActiveChamber: (chamber) => set({ activeChamber: chamber }),
  setSelectedVault: (vaultId) => set({ selectedVaultId: vaultId }),
  setLastVisitedView: (module, path) =>
    set((state) => ({
      lastVisitedView: { ...state.lastVisitedView, [module]: path },
    })),
}));

export type { ModuleName, ChamberName };
