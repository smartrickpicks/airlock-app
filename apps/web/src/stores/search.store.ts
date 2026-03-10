import { create } from "zustand";
import Fuse from "fuse.js";
import type { SearchItem, SearchItemType } from "@/lib/mock-search";
import { SEARCH_INDEX } from "@/lib/mock-search";
import { apiFetch } from "@/lib/api";

const fuse = new Fuse(SEARCH_INDEX, {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "keywords", weight: 0.3 },
    { name: "subtitle", weight: 0.2 },
  ],
  threshold: 0.4,
  includeScore: true,
});

// ─── API response shape ──────────────────────────────────────────────

interface ApiSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  module: string;
  href: string;
  keywords?: string[];
}

interface ApiSearchResponse {
  results: ApiSearchResult[];
  total: number;
}

// ─── Category filter ─────────────────────────────────────────────────

export type SearchCategory =
  | "all"
  | "vault"
  | "task"
  | "document"
  | "event"
  | "page"
  | "action";

export const SEARCH_CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "vault", label: "Vaults" },
  { key: "task", label: "Tasks" },
  { key: "document", label: "Documents" },
  { key: "event", label: "Events" },
  { key: "page", label: "People" },
  { key: "action", label: "Actions" },
];

// ─── Store ───────────────────────────────────────────────────────────

interface SearchState {
  isOpen: boolean;
  query: string;
  results: SearchItem[];
  selectedIndex: number;
  isSearching: boolean;
  activeCategory: SearchCategory;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  setCategory: (category: SearchCategory) => void;
  selectNext: () => void;
  selectPrev: () => void;
  getSelectedItem: () => SearchItem | null;
  apiSearch: (
    query: string,
    category?: SearchCategory,
  ) => Promise<SearchItem[]>;
  search: (query: string) => void;
}

/** Map an API result to the local SearchItem shape. */
function mapApiResult(r: ApiSearchResult): SearchItem {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? "",
    type: (r.type as SearchItemType) ?? "page",
    module: r.module,
    href: r.href,
    keywords: r.keywords ?? [],
  };
}

/** Fuse.js local search (fallback). */
function fuseSearch(query: string, category: SearchCategory): SearchItem[] {
  const fuseResults = fuse.search(query, { limit: 20 });
  const items = fuseResults.map((r) => r.item);
  if (category === "all") return items;
  return items.filter((i) => i.type === category);
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  query: "",
  results: [],
  selectedIndex: 0,
  isSearching: false,
  activeCategory: "all",

  open: () =>
    set({
      isOpen: true,
      query: "",
      results: [],
      selectedIndex: 0,
      isSearching: false,
      activeCategory: "all",
    }),

  close: () =>
    set({
      isOpen: false,
      query: "",
      results: [],
      selectedIndex: 0,
      isSearching: false,
      activeCategory: "all",
    }),

  toggle: () => {
    const { isOpen } = get();
    if (isOpen) {
      get().close();
    } else {
      get().open();
    }
  },

  setCategory: (category) => {
    set({ activeCategory: category, selectedIndex: 0 });
    const { query } = get();
    // Re-run search with new category
    get().search(query);
  },

  setQuery: (query) => {
    set({ query });
    get().search(query);
  },

  /** Call the API search endpoint. Returns mapped SearchItems. */
  apiSearch: async (query, category) => {
    const type = category && category !== "all" ? category : undefined;
    const params = new URLSearchParams({ q: query, limit: "20" });
    if (type) params.set("type", type);

    const data = await apiFetch<ApiSearchResponse>(
      `/api/v1/search?${params.toString()}`,
    );
    return data.results.map(mapApiResult);
  },

  /** Unified search: API first for queries > 2 chars, Fuse.js fallback. */
  search: (query) => {
    const { activeCategory } = get();

    if (!query.trim()) {
      // Show recent pages when empty
      let recentPages = SEARCH_INDEX.filter((i) => i.type === "page").slice(
        0,
        8,
      );
      if (activeCategory !== "all") {
        recentPages = recentPages.filter((i) => i.type === activeCategory);
      }
      set({ results: recentPages, selectedIndex: 0, isSearching: false });
      return;
    }

    // Short queries: Fuse.js only (fast, local)
    if (query.trim().length <= 2) {
      const local = fuseSearch(query, activeCategory);
      set({ results: local, selectedIndex: 0, isSearching: false });
      return;
    }

    // Longer queries: try API first, fall back to Fuse.js
    set({ isSearching: true });

    get()
      .apiSearch(query, activeCategory)
      .then((apiResults) => {
        // Only update if the query hasn't changed while we were fetching
        if (get().query === query) {
          set({
            results: apiResults,
            selectedIndex: 0,
            isSearching: false,
          });
        }
      })
      .catch(() => {
        // API unavailable — use local Fuse.js
        if (get().query === query) {
          const local = fuseSearch(query, activeCategory);
          set({ results: local, selectedIndex: 0, isSearching: false });
        }
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
