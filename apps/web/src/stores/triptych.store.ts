import { create } from "zustand";

type PanelMode = "overview" | "inspect" | "edit" | "approve";

interface TriptychState {
  /** Signal panel (left) — collapsed or visible */
  signalVisible: boolean;
  /** Control panel (right) — collapsed or visible */
  controlVisible: boolean;
  /** Signal panel width in pixels */
  signalWidth: number;
  /** Control panel width in pixels */
  controlWidth: number;
  /** Current mode of the Orchestrate panel */
  orchestrateMode: PanelMode;

  /** Toggle Signal panel visibility */
  toggleSignal: () => void;
  /** Toggle Control panel visibility */
  toggleControl: () => void;
  /** Set Signal panel width */
  setSignalWidth: (width: number) => void;
  /** Set Control panel width */
  setControlWidth: (width: number) => void;
  /** Set Orchestrate panel mode */
  setOrchestrateMode: (mode: PanelMode) => void;
}

export const useTriptychStore = create<TriptychState>((set) => ({
  signalVisible: true,
  controlVisible: true,
  signalWidth: 320,
  controlWidth: 320,
  orchestrateMode: "overview",

  toggleSignal: () => set((state) => ({ signalVisible: !state.signalVisible })),
  toggleControl: () =>
    set((state) => ({ controlVisible: !state.controlVisible })),
  setSignalWidth: (width) => set({ signalWidth: Math.max(240, width) }),
  setControlWidth: (width) => set({ controlWidth: Math.max(240, width) }),
  setOrchestrateMode: (mode) => set({ orchestrateMode: mode }),
}));
