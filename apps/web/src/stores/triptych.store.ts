import { create } from "zustand";

type PanelMode = "overview" | "inspect" | "edit" | "approve";
type ViewState = "standard" | "artifact-focus" | "action-focus" | "gate-lock";
type ControlTabKey = "lifecycle" | "sla" | "approvals" | "audit" | "ai-agent";

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

  /** Current view state of the Triptych layout */
  viewState: ViewState;
  /** Whether the Signal overlay is open (collapsed mode click) */
  signalOverlayOpen: boolean;
  /** Whether the Control overlay is open (collapsed mode click) */
  controlOverlayOpen: boolean;
  /** Currently active Control panel tab */
  activeControlTab: ControlTabKey;

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

  /** Set the active view state and adjust panels accordingly */
  setViewState: (state: ViewState) => void;
  /** Open the Signal overlay (collapsed panel click) */
  openSignalOverlay: () => void;
  /** Close the Signal overlay */
  closeSignalOverlay: () => void;
  /** Open the Control overlay (collapsed panel click) */
  openControlOverlay: () => void;
  /** Close the Control overlay */
  closeControlOverlay: () => void;
  /** Set the active Control panel tab */
  setActiveControlTab: (tab: ControlTabKey) => void;
}

export const useTriptychStore = create<TriptychState>((set) => ({
  signalVisible: true,
  controlVisible: true,
  signalWidth: 280,
  controlWidth: 300,
  orchestrateMode: "overview",

  viewState: "standard",
  signalOverlayOpen: false,
  controlOverlayOpen: false,
  activeControlTab: "lifecycle",

  toggleSignal: () => set((state) => ({ signalVisible: !state.signalVisible })),
  toggleControl: () =>
    set((state) => ({ controlVisible: !state.controlVisible })),
  setSignalWidth: (width) => set({ signalWidth: Math.max(200, width) }),
  setControlWidth: (width) => set({ controlWidth: Math.max(200, width) }),
  setOrchestrateMode: (mode) => set({ orchestrateMode: mode }),

  setViewState: (viewState) => {
    switch (viewState) {
      case "standard":
        return set({
          viewState,
          signalVisible: true,
          controlVisible: true,
          signalOverlayOpen: false,
          controlOverlayOpen: false,
        });
      case "artifact-focus":
        return set({
          viewState,
          signalVisible: false,
          controlVisible: false,
          signalOverlayOpen: false,
          controlOverlayOpen: false,
        });
      case "action-focus":
        return set({
          viewState,
          signalVisible: false,
          controlVisible: true,
          signalOverlayOpen: false,
          controlOverlayOpen: false,
        });
      case "gate-lock":
        return set({
          viewState,
          signalVisible: true,
          controlVisible: true,
          signalOverlayOpen: false,
          controlOverlayOpen: false,
          activeControlTab: "approvals",
        });
      default:
        return set({ viewState });
    }
  },

  openSignalOverlay: () => set({ signalOverlayOpen: true }),
  closeSignalOverlay: () => set({ signalOverlayOpen: false }),
  openControlOverlay: () => set({ controlOverlayOpen: true }),
  closeControlOverlay: () => set({ controlOverlayOpen: false }),
  setActiveControlTab: (tab) => set({ activeControlTab: tab }),
}));

export type { ViewState, ControlTabKey, PanelMode };
