import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type {
  CapabilityId,
  CapabilityState,
  CapabilityDefinition,
} from "@/lib/mock-capabilities";
import {
  CAPABILITY_DEFINITIONS,
  INITIAL_CONFIGURED,
  TOTAL_CAPABILITIES,
  deriveCapabilityStates,
  buildCapabilityNodes,
  buildCapabilityEdges,
  getNextRecommended,
  getUnlockDescription,
} from "@/lib/mock-capabilities";

interface CapabilityStoreState {
  configuredIds: Set<CapabilityId>;
  states: Record<CapabilityId, CapabilityState>;
  nodes: Node[];
  edges: Edge[];
  bannerDismissed: boolean;
  isLoading: boolean;

  /* actions */
  init: () => void;
  configureCapability: (id: CapabilityId) => void;
  dismissBanner: () => void;

  /* derived accessors */
  progress: () => { configured: number; total: number };
  nextRecommended: () => {
    capability: CapabilityDefinition | null;
    unlockText: string;
  };
}

function rebuildGraph(configuredIds: Set<CapabilityId>) {
  const states = deriveCapabilityStates(configuredIds);
  const nodes = buildCapabilityNodes(states) as Node[];
  const edges = buildCapabilityEdges(states);
  return { states, nodes, edges };
}

export const useCapabilityStore = create<CapabilityStoreState>((set, get) => ({
  configuredIds: new Set(INITIAL_CONFIGURED),
  states: {} as Record<CapabilityId, CapabilityState>,
  nodes: [],
  edges: [],
  bannerDismissed: false,
  isLoading: false,

  init: () => {
    // Load persisted state from localStorage if available
    let configuredIds = new Set(INITIAL_CONFIGURED);
    try {
      const saved = localStorage.getItem("airlock:configured-capabilities");
      if (saved) {
        const parsed = JSON.parse(saved) as CapabilityId[];
        configuredIds = new Set(parsed);
      }
    } catch {
      // Use default
    }

    const { states, nodes, edges } = rebuildGraph(configuredIds);
    set({ configuredIds, states, nodes, edges });
  },

  configureCapability: (id) => {
    const next = new Set(get().configuredIds);
    next.add(id);

    // Auto-configure dependents (e.g., OTTO when AI Provider is configured)
    for (const cap of CAPABILITY_DEFINITIONS) {
      if (cap.autoConfigTrigger && next.has(cap.autoConfigTrigger)) {
        next.add(cap.id);
      }
    }

    const { states, nodes, edges } = rebuildGraph(next);

    // Persist to localStorage
    try {
      localStorage.setItem(
        "airlock:configured-capabilities",
        JSON.stringify(Array.from(next)),
      );
    } catch {
      // Storage may be unavailable
    }

    set({ configuredIds: next, states, nodes, edges, bannerDismissed: false });
  },

  dismissBanner: () => set({ bannerDismissed: true }),

  progress: () => {
    const { configuredIds } = get();
    return { configured: configuredIds.size, total: TOTAL_CAPABILITIES };
  },

  nextRecommended: () => {
    const { states } = get();
    const capability = getNextRecommended(states);
    const unlockText = capability ? getUnlockDescription(capability.id) : "";
    return { capability, unlockText };
  },
}));
