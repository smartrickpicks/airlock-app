"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchStore, SEARCH_CATEGORIES } from "@/stores/search.store";
import type { SearchCategory } from "@/stores/search.store";
import { useModuleStore } from "@/stores/module.store";
import { SEARCH_TYPE_CONFIG } from "@/lib/mock-search";

export default function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeModule = useModuleStore((s) => s.activeModule);
  const {
    isOpen,
    query,
    results,
    selectedIndex,
    isSearching,
    activeCategory,
    moduleScope,
    close,
    setQuery,
    setCategory,
    setModuleScope,
    selectNext,
    selectPrev,
    getSelectedItem,
  } = useSearchStore();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Auto-scope to current module when palette opens (US-078)
  useEffect(() => {
    if (isOpen && activeModule && activeModule !== "home") {
      useSearchStore.setState({ moduleScope: activeModule });
    }
  }, [isOpen, activeModule]);

  // Debounced input handler — 300ms for queries > 2 chars
  const handleInputChange = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Short queries update immediately (Fuse.js, no API call)
      if (value.trim().length <= 2) {
        setQuery(value);
        return;
      }

      // Longer queries: update the displayed query immediately,
      // but debounce the actual search by 300ms
      useSearchStore.setState({ query: value });
      debounceRef.current = setTimeout(() => {
        setQuery(value);
      }, 300);
    },
    [setQuery],
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          close();
          break;
        case "ArrowDown":
          e.preventDefault();
          selectNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectPrev();
          break;
        case "Enter": {
          e.preventDefault();
          const item = getSelectedItem();
          if (item) {
            router.push(item.href);
            close();
          }
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close, selectNext, selectPrev, getSelectedItem, router]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[15vh] bg-black/60"
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-surface-border bg-surface-raised shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-text-muted text-sm">⌘K</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              moduleScope
                ? `Search in ${moduleScope}...`
                : "Search vaults, tasks, documents, pages..."
            }
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          {isSearching && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-pulse" />
              <span className="text-[10px] text-text-muted">Loading</span>
            </div>
          )}
          <button
            onClick={close}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-text-muted bg-surface-overlay"
          >
            ESC
          </button>
        </div>

        {/* Module scope indicator + category filter chips */}
        <div className="flex items-center gap-1.5 border-b border-surface-border px-4 py-2 overflow-x-auto">
          {moduleScope && (
            <button
              onClick={() => setModuleScope(null)}
              className="flex items-center gap-1 rounded-full bg-accent-primary/15 px-2.5 py-1 text-[11px] font-medium text-accent-primary whitespace-nowrap mr-1"
            >
              {moduleScope}
              <span className="ml-0.5 text-[9px] opacity-70">✕</span>
            </button>
          )}
          {SEARCH_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat.key}
              label={cat.label}
              active={activeCategory === cat.key}
              onClick={() => setCategory(cat.key)}
            />
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {isSearching && results.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-text-muted animate-pulse">
              Searching...
            </div>
          ) : results.length === 0 && query.trim() ? (
            <div className="px-3 py-8 text-center text-sm text-text-muted">
              No results for &ldquo;{query}&rdquo;
              {moduleScope && (
                <button
                  onClick={() => setModuleScope(null)}
                  className="mt-2 block mx-auto text-accent-primary text-[11px] hover:underline"
                >
                  Search all modules
                </button>
              )}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-text-muted">
              Start typing to search...
            </div>
          ) : (
            results.map((item, idx) => {
              const cfg = SEARCH_TYPE_CONFIG[item.type];
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    close();
                  }}
                  onMouseEnter={() =>
                    useSearchStore.setState({ selectedIndex: idx })
                  }
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-accent-primary/10 text-text-primary"
                      : "text-text-secondary hover:bg-surface-overlay"
                  }`}
                >
                  <span className={`text-sm ${cfg.color}`}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-text-muted truncate">
                      {item.subtitle}
                    </p>
                  </div>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-overlay text-text-muted flex-shrink-0">
                    {cfg.label}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-surface-border px-4 py-2 text-[10px] text-text-muted">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>esc Close</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component ───────────────────────────────────────────────────

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-accent-primary/20 text-accent-primary"
          : "bg-surface-overlay text-text-muted hover:text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
}
