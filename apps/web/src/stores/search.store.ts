import { create } from "zustand";
import Fuse from "fuse.js";
import type { SearchItem } from "@/lib/mock-search";
import { SEARCH_INDEX } from "@/lib/mock-search";

const fuse = new Fuse(SEARCH_INDEX, {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "keywords", weight: 0.3 },
    { name: "subtitle", weight: 0.2 },
  ],
  threshold: 0.4,
  includeScore: true,
});

interface SearchState {
  isOpen: boolean;
  query: string;
  results: SearchItem[];
  selectedIndex: number;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  selectNext: () => void;
  selectPrev: () => void;
  getSelectedItem: () => SearchItem | null;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  query: "",
  results: [],
  selectedIndex: 0,

  open: () => set({ isOpen: true, query: "", results: [], selectedIndex: 0 }),
  close: () => set({ isOpen: false, query: "", results: [], selectedIndex: 0 }),
  toggle: () => {
    const { isOpen } = get();
    if (isOpen) {
      get().close();
    } else {
      get().open();
    }
  },

  setQuery: (query) => {
    if (!query.trim()) {
      // Show recent pages when empty
      const recentPages = SEARCH_INDEX.filter((i) => i.type === "page").slice(
        0,
        8,
      );
      set({ query, results: recentPages, selectedIndex: 0 });
      return;
    }
    const fuseResults = fuse.search(query, { limit: 12 });
    set({
      query,
      results: fuseResults.map((r) => r.item),
      selectedIndex: 0,
    });
  },

  selectNext: () =>
    set((state) => ({
      selectedIndex: Math.min(
        state.selectedIndex + 1,
        state.results.length - 1,
      ),
    })),

  selectPrev: () =>
    set((state) => ({
      selectedIndex: Math.max(state.selectedIndex - 1, 0),
    })),

  getSelectedItem: () => {
    const { results, selectedIndex } = get();
    return results[selectedIndex] ?? null;
  },
}));
