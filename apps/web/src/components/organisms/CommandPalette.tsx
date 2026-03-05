"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSearchStore } from "@/stores/search.store";
import { SEARCH_TYPE_CONFIG } from "@/lib/mock-search";

export default function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    isOpen,
    query,
    results,
    selectedIndex,
    close,
    setQuery,
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vaults, tasks, documents, pages..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <button
            onClick={close}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-text-muted bg-surface-overlay"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 && query.trim() ? (
            <div className="px-3 py-8 text-center text-sm text-text-muted">
              No results for &ldquo;{query}&rdquo;
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
