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

// ─── Helpers ─────────────────────────────────────────────────────────

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

/** Fuse.js local search (fallback / instant results). */
function fuseSearch(
  query: string,
  category: SearchCategory,
  moduleScope?: string | null,
): SearchItem[] {
  const fuseResults = fuse.search(query, { limit: 20 });
  let items = fuseResults.map((r) => r.item);
  if (category !== "all") {
    items = items.filter((i) => i.type === category);
  }
  if (moduleScope) {
    items = items.filter((i) => i.module === moduleScope);
  }
  return items;
}

/**
 * Merge two SearchItem arrays, deduplicating by `id`.
 * Items from `primary` take precedence over `secondary`.
 */
function mergeResults(
  primary: SearchItem[],
  secondary: SearchItem[],
): SearchItem[] {
  const seen = new Set(primary.map((item) => item.id));
  const merged = [...primary];
  for (const item of secondary) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

// ─── Store ───────────────────────────────────────────────────────────

interface SearchState {
  isOpen: boolean;
  query: string;
  results: SearchItem[];
  selectedIndex: number;
  isSearching: boolean;
  activeCategory: SearchCategory;
  /** Whether the API has responded successfully at least once this session */
  useApiSearch: boolean;
  /** Module scope — when set, results are filtered to this module (US-078) */
  moduleScope: string | null;

  open: (moduleScope?: string | null) => void;
  close: () => void;
  toggle: (moduleScope?: string | null) => void;
  setQuery: (query: string) => void;
  setCategory: (category: SearchCategory) => void;
  setModuleScope: (scope: string | null) => void;
  selectNext: () => void;
  selectPrev: () => void;
  getSelectedItem: () => SearchItem | null;
  apiSearch: (
    query: string,
    category?: SearchCategory,
    moduleScope?: string | null,
  ) => Promise<SearchItem[]>;
  search: (query: string) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  query: "",
  results: [],
  selectedIndex: 0,
  isSearching: false,
  activeCategory: "all",
  useApiSearch: false,
  moduleScope: null,

  open: (moduleScope) =>
    set({
      isOpen: true,
      query: "",
      results: [],
      selectedIndex: 0,
      isSearching: false,
      activeCategory: "all",
      moduleScope: moduleScope ?? null,
    }),

  close: () =>
    set({
      isOpen: false,
      query: "",
      results: [],
      selectedIndex: 0,
      isSearching: false,
      activeCategory: "all",
      moduleScope: null,
    }),

  toggle: (moduleScope) => {
    const { isOpen } = get();
    if (isOpen) {
      get().close();
    } else {
      get().open(moduleScope);
    }
  },

  setCategory: (category) => {
    set({ activeCategory: category, selectedIndex: 0 });
    const { query } = get();
    // Re-run search with new category
    get().search(query);
  },

  setModuleScope: (scope) => {
    set({ moduleScope: scope, selectedIndex: 0 });
    const { query } = get();
    get().search(query);
  },

  setQuery: (query) => {
    set({ query });
    get().search(query);
  },

  /** Call the API search endpoint. Returns mapped SearchItems. */
  apiSearch: async (query, category, moduleScope) => {
    const type = category && category !== "all" ? category : undefined;
    const params = new URLSearchParams({ q: query, limit: "20" });
    if (type) params.set("type", type);
    if (moduleScope) params.set("module", moduleScope);

    const data = await apiFetch<ApiSearchResponse>(
      `/api/v1/search?${params.toString()}`,
    );
    return data.results.map(mapApiResult);
  },

  /**
   * Unified search: shows Fuse.js results immediately, then merges API
   * results when they arrive (for queries > 2 chars). Falls back to
   * Fuse.js-only when the API is unavailable.
   */
  search: (query) => {
    const { activeCategory, moduleScope } = get();

    if (!query.trim()) {
      // Show recent pages when empty
      let recentPages = SEARCH_INDEX.filter((i) => i.type === "page").slice(
        0,
        8,
      );
      if (activeCategory !== "all") {
        recentPages = recentPages.filter((i) => i.type === activeCategory);
      }
      if (moduleScope) {
        recentPages = recentPages.filter((i) => i.module === moduleScope);
      }
      set({ results: recentPages, selectedIndex: 0, isSearching: false });
      return;
    }

    // Get instant Fuse.js results for all query lengths
    const local = fuseSearch(query, activeCategory, moduleScope);

    // Short queries: Fuse.js only (fast, local, no API call)
    if (query.trim().length <= 2) {
      set({ results: local, selectedIndex: 0, isSearching: false });
      return;
    }

    // Longer queries: show Fuse.js results immediately, then fire API
    set({ results: local, selectedIndex: 0, isSearching: true });

    get()
      .apiSearch(query, activeCategory, moduleScope)
      .then((apiResults) => {
        // Only update if the query hasn't changed while we were fetching
        if (get().query === query) {
          // API succeeded — mark as available and merge results
          const merged = mergeResults(apiResults, local);
          set({
            results: merged,
            selectedIndex: 0,
            isSearching: false,
            useApiSearch: true,
          });
        }
      })
      .catch(() => {
        // API unavailable — Fuse.js results are already displayed
        if (get().query === query) {
          set({ isSearching: false });
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
