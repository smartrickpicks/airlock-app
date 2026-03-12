"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface GifResult {
  id: string;
  title: string;
  url: string;
  width: number;
  height: number;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  provider: string;
}

interface GifPickerProps {
  onSelect: (gif: GifResult) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Fetch GIFs (trending or search)
  const fetchGifs = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const endpoint = searchQuery.trim()
        ? `/api/chat/gifs/search?q=${encodeURIComponent(searchQuery)}&limit=20`
        : "/api/chat/gifs/trending?limit=20";
      const data = await apiFetch<{ gifs: GifResult[] }>(endpoint);
      setGifs(data.gifs);
    } catch {
      setGifs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load trending on mount
  useEffect(() => {
    fetchGifs("");
  }, [fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchGifs]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-80 bg-surface-overlay border border-border-subtle rounded-lg shadow-xl z-50 overflow-hidden"
    >
      {/* Search bar */}
      <div className="p-2 border-b border-border-subtle">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="w-full px-3 py-1.5 bg-surface-base border border-border-subtle rounded text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-blue-500"
          autoFocus
        />
      </div>

      {/* GIF grid */}
      <div className="h-64 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            Loading...
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            {query ? "No GIFs found" : "No trending GIFs"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif)}
                className="relative rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                style={{
                  aspectRatio: `${gif.previewWidth || 1}/${gif.previewHeight || 1}`,
                }}
              >
                <img
                  src={gif.previewUrl || gif.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KLIPY attribution */}
      <div className="px-2 py-1 border-t border-border-subtle text-[10px] text-text-tertiary text-right">
        Powered by KLIPY
      </div>
    </div>
  );
}
