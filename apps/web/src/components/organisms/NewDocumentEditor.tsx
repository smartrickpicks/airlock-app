"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  Download,
  Trash2,
  Check,
  Loader2,
} from "lucide-react";
import type { LocalDraft } from "@/hooks/useLocalDrafts";

const TipTapViewer = dynamic(
  () => import("@/components/organisms/TipTapViewer"),
  { ssr: false },
);

type SaveStatus = "idle" | "saving" | "saved";

interface NewDocumentEditorProps {
  draft: LocalDraft;
  onUpdate: (id: string, data: Partial<Pick<LocalDraft, "title" | "content">>) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function NewDocumentEditor({
  draft,
  onUpdate,
  onExport,
  onDelete,
  onClose,
}: NewDocumentEditorProps) {
  const [title, setTitle] = useState(draft.title);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger save status UI
  const triggerSave = useCallback(() => {
    setSaveStatus("saving");
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setSaveStatus("saved"), 800);
  }, []);

  // Debounced title save
  useEffect(() => {
    if (title === draft.title) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate(draft.id, { title });
      triggerSave();
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, draft.id, draft.title, onUpdate, triggerSave]);

  // Content update from TipTap (already debounced by caller)
  const handleContentUpdate = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(draft.id, { content: html });
        triggerSave();
      }, 1000);
    },
    [draft.id, onUpdate, triggerSave],
  );

  const handleDiscard = () => {
    onDelete(draft.id);
    onClose();
  };

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Editor header */}
      <div className="flex items-center gap-3 border-b border-surface-border bg-surface-raised px-6 py-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
        >
          <ChevronLeft size={14} />
          Library
        </button>

        <div className="mx-1 h-4 w-px bg-surface-border" />

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Document"
          autoFocus
          className="flex-1 bg-transparent text-base font-semibold text-text-primary placeholder-text-muted outline-none"
        />

        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-text-muted">
              <Loader2 size={11} className="animate-spin" />
              Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-accent-success">
              <Check size={11} />
              Saved
            </span>
          )}
          {saveStatus === "idle" && (
            <span className="text-text-muted">Local draft</span>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-surface-border" />

        {/* Actions */}
        <button
          onClick={() => onExport(draft.id)}
          title="Save to file (.md)"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
        >
          <Download size={13} />
          Save to file
        </button>

        <button
          onClick={handleDiscard}
          title="Discard draft"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-accent-danger/70 transition-colors hover:bg-accent-danger/10 hover:text-accent-danger"
        >
          <Trash2 size={13} />
          Discard
        </button>
      </div>

      {/* TipTap editor — full height */}
      <div className="flex-1 overflow-hidden p-6">
        <TipTapViewer
          content={draft.content}
          editable={true}
          onUpdate={handleContentUpdate}
        />
      </div>
    </div>
  );
}
