import { create } from "zustand";

type NodeState = "locked" | "available" | "configured";

interface CapabilityTreeState {
  nodeStates: Record<string, NodeState>;
  nodeConfigs: Record<string, Record<string, unknown>>;

  setNodeState: (id: string, state: NodeState) => void;
  setNodeConfig: (id: string, config: Record<string, unknown>) => void;
  getProgress: () => { configured: number; total: number };
}

const ALL_NODE_IDS = [
  "workspace",
  "ai_provider",
  "data_source",
  "modules",
  "members",
  "roles",
  "otto",
  "mcp_servers",
  "skills",
  "integrations",
  "workflows",
  "event_bus",
  "feature_flags",
];

const DEFAULT_STATES: Record<string, NodeState> = {
  workspace: "configured",
  members: "configured",
  feature_flags: "configured",
  ai_provider: "available",
  data_source: "available",
  modules: "available",
  roles: "available",
  otto: "available",
  mcp_servers: "available",
  skills: "available",
  integrations: "available",
  workflows: "available",
  event_bus: "available",
};

export const useCapabilityTreeStore = create<CapabilityTreeState>((set, get) => ({
  nodeStates: DEFAULT_STATES,
  nodeConfigs: {},

  setNodeState: (id, state) =>
    set((s) => ({ nodeStates: { ...s.nodeStates, [id]: state } })),

  setNodeConfig: (id, config) =>
    set((s) => ({ nodeConfigs: { ...s.nodeConfigs, [id]: config } })),

  getProgress: () => {
    const { nodeStates } = get();
    const configured = ALL_NODE_IDS.filter(
      (id) => nodeStates[id] === "configured",
    ).length;
    return { configured, total: ALL_NODE_IDS.length };
  },
}));
