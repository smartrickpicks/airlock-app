import { create } from "zustand";

type ModuleName = "contracts" | "crm" | "tasks" | "calendar" | "documents";
type ChamberName = "discover" | "build" | "review" | "ship";

interface ModuleState {
  /** Currently active module */
  activeModule: ModuleName;
  /** Currently active chamber within the module */
  activeChamber: ChamberName;
  /** Currently selected vault ID (null if on list view) */
  selectedVaultId: string | null;

  /** Set the active module */
  setActiveModule: (module: ModuleName) => void;
  /** Set the active chamber */
  setActiveChamber: (chamber: ChamberName) => void;
  /** Set the selected vault */
  setSelectedVault: (vaultId: string | null) => void;
}

export const useModuleStore = create<ModuleState>((set) => ({
  activeModule: "contracts",
  activeChamber: "discover",
  selectedVaultId: null,

  setActiveModule: (module) =>
    set({ activeModule: module, selectedVaultId: null }),
  setActiveChamber: (chamber) => set({ activeChamber: chamber }),
  setSelectedVault: (vaultId) => set({ selectedVaultId: vaultId }),
}));
