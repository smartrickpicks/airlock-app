"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, MessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface SearchResult {
  id: string;
  conversationId: string;
  conversationName: string | null;
  authorId: string | null;
  authorName: string;
  content: string;
  messageType: string;
  createdAt: string;
}

interface SearchMessagesProps {
  onClose: () => void;
  onResultClick: (conversationId: string) => void;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-[#00D1FF]/20 text-text-primary rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function SearchMessages({
  onClose,
  onResultClick,
}: SearchMessagesProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setDemoMode(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(false);
      try {
        const data = await apiFetch<SearchResult[]>(
          `/api/chat/search?q=${encodeURIComponent(query)}&limit=20`,
        );
        setResults(data);
        setDemoMode(false);
      } catch {
        setResults([]);
        setDemoMode(true);
      } finally {
        setIsLoading(false);
        setHasSearched(true);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const truncate = (text: string, max = 100) =>
    text.length > max ? text.slice(0, max) + "…" : text;

  return (
    <div className="flex h-full flex-col">
      {/* Search header */}
      <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
        <Search size={14} className="shrink-0 text-text-tertiary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages…"
          className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={onClose}
          className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close search"
        >
          <X size={16} />
        </button>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty (no query) */}
        {!query.trim() && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <MessageSquare size={32} className="text-text-muted" />
            <p className="text-sm text-text-muted">
              Search messages across all conversations
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="px-4 py-3">
            <p className="text-sm text-text-muted">Searching…</p>
          </div>
        )}

        {/* Demo mode fallback */}
        {!isLoading && demoMode && hasSearched && (
          <div className="px-4 py-3">
            <p className="text-sm text-text-muted">
              Search unavailable in demo mode
            </p>
          </div>
        )}

        {/* No results */}
        {!isLoading && !demoMode && hasSearched && results.length === 0 && (
          <div className="px-4 py-3">
            <p className="text-sm text-text-muted">
              No messages found for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {/* Results list */}
        {!isLoading && results.length > 0 && (
          <ul className="divide-y divide-surface-border">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  onClick={() => onResultClick(result.conversationId)}
                  className="w-full px-4 py-3 text-left hover:bg-surface-hover transition-colors"
                >
                  {/* Conversation name */}
                  {result.conversationName && (
                    <p className="mb-0.5 text-xs font-medium text-text-tertiary">
                      {result.conversationName}
                    </p>
                  )}

                  {/* Author + timestamp */}
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-text-secondary">
                      {result.authorName}
                    </span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {formatRelativeTime(result.createdAt)}
                    </span>
                  </div>

                  {/* Message preview with highlight */}
                  <p className="text-sm leading-snug text-text-primary">
                    {highlightMatch(truncate(result.content), query)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
