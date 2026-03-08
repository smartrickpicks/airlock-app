"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "airlock:drafts";
const MAX_DRAFTS = 50;

export interface LocalDraft {
  id: string;
  title: string;
  content: string; // TipTap HTML
  createdAt: string;
  updatedAt: string;
}

function readFromStorage(): LocalDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalDraft[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(drafts: LocalDraft[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

/** Convert TipTap HTML to a rough markdown string for file export. */
export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "_$1_")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "_$1_")
    .replace(/<s[^>]*>(.*?)<\/s>/gi, "~~$1~~")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, "> $1\n\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, "$1\n")
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, "$1\n")
    .replace(/<hr\s*\/?>/gi, "\n---\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "untitled"
  );
}

export function useLocalDrafts() {
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setDrafts(readFromStorage());
  }, []);

  const createDraft = useCallback((): LocalDraft => {
    const now = new Date().toISOString();
    const draft: LocalDraft = {
      id: `draft_${Date.now()}`,
      title: "Untitled Document",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    setDrafts((prev) => {
      const next = [draft, ...prev].slice(0, MAX_DRAFTS);
      writeToStorage(next);
      return next;
    });
    return draft;
  }, []);

  const updateDraft = useCallback(
    (id: string, data: Partial<Pick<LocalDraft, "title" | "content">>) => {
      setDrafts((prev) => {
        const next = prev.map((d) =>
          d.id === id
            ? { ...d, ...data, updatedAt: new Date().toISOString() }
            : d,
        );
        writeToStorage(next);
        return next;
      });
    },
    [],
  );

  const deleteDraft = useCallback((id: string) => {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      writeToStorage(next);
      return next;
    });
  }, []);

  const exportDraft = useCallback(
    (id: string) => {
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return;
      const markdown = `# ${draft.title}\n\n${htmlToMarkdown(draft.content)}`;
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(draft.title)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [drafts],
  );

  return { drafts, createDraft, updateDraft, deleteDraft, exportDraft };
}
