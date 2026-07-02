import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_PARENT_VAULTS,
  MOCK_HANDOFF_SIGNALS,
  MOCK_FEED_ITEMS,
  type ParentVaultCard,
  type HandoffSignal,
  type FeedItem,
  type SignalType,
} from "@/lib/mock-review-queue";
import {
  mergeDemoReviewFeedItems,
  mergeDemoReviewParentVaults,
} from "@/stores/demo-lifecycle.store";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface ReviewQueueState {
  parentVaults: ParentVaultCard[];
  signals: HandoffSignal[];
  feedItems: FeedItem[];
  isLoading: boolean;
  error: string | null;
  expandedCards: Set<string>;
  activeFilter: SignalType | "all";
  builderFilter: string | null;
  entityFilter: string | null;

  /** Fetch review queue data (parent vaults, signals, feed) */
  fetchReviewQueue: () => Promise<void>;
  /** Toggle a parent vault card's expanded/collapsed state */
  toggleCard: (cardId: string) => void;
  /** Set the active signal-type filter */
  setActiveFilter: (filter: SignalType | "all") => void;
  /** Filter by builder name (null = show all) */
  setBuilderFilter: (builder: string | null) => void;
  /** Filter by entity name (null = show all) */
  setEntityFilter: (entity: string | null) => void;
}

export const useReviewQueueStore = create<ReviewQueueState>((set) => ({
  parentVaults: [],
  signals: [],
  feedItems: [],
  isLoading: false,
  error: null,
  expandedCards: new Set<string>(),
  activeFilter: "all",
  builderFilter: null,
  entityFilter: null,

  fetchReviewQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{
        parentVaults: ParentVaultCard[];
        signals: HandoffSignal[];
        feedItems: FeedItem[];
      }>("/api/v1/contracts/review-queue");
      set({
        parentVaults: mergeDemoReviewParentVaults(data.parentVaults),
        signals: data.signals,
        feedItems: mergeDemoReviewFeedItems(data.feedItems),
        isLoading: false,
      });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({
          parentVaults: [],
          signals: [],
          feedItems: [],
          isLoading: false,
          error: null,
        });
      } else {
        // API not running — use mock data for dev preview
        set({
          parentVaults: mergeDemoReviewParentVaults(MOCK_PARENT_VAULTS),
          signals: MOCK_HANDOFF_SIGNALS,
          feedItems: mergeDemoReviewFeedItems(MOCK_FEED_ITEMS),
          isLoading: false,
          error: null,
        });
      }
    }
  },

  toggleCard: (cardId) =>
    set((state) => {
      const next = new Set(state.expandedCards);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return { expandedCards: next };
    }),

  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setBuilderFilter: (builder) => set({ builderFilter: builder }),
  setEntityFilter: (entity) => set({ entityFilter: entity }),
}));
