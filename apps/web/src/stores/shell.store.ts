import { create } from "zustand";

export type RightToolId =
  | "activity"
  | "inbox"
  | "messenger"
  | "otto"
  | "compose"
  | "quick_actions";

export const PUSH_PANEL_TOOLS: RightToolId[] = [
  "activity",
  "inbox",
  "quick_actions",
];

interface ShellChromeState {
  activeRightTool: RightToolId | null;
  openTool: (tool: RightToolId) => void;
  toggleTool: (tool: RightToolId) => void;
  closeTool: () => void;
}

export const useShellStore = create<ShellChromeState>((set) => ({
  activeRightTool: null,
  openTool: (tool) =>
    set((state) =>
      state.activeRightTool === tool ? state : { activeRightTool: tool },
    ),
  toggleTool: (tool) =>
    set((state) => ({
      activeRightTool: state.activeRightTool === tool ? null : tool,
    })),
  closeTool: () =>
    set((state) =>
      state.activeRightTool === null ? state : { activeRightTool: null },
    ),
}));
