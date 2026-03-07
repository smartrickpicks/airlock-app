"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { useDocumentsStore } from "@/stores/documents.store";
import { useLocalDrafts } from "@/hooks/useLocalDrafts";
import DocumentsTable from "@/components/organisms/DocumentsTable";
import DocumentPreview from "@/components/organisms/DocumentPreview";
import NewDocumentEditor from "@/components/organisms/NewDocumentEditor";

function formatRelativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

export default function DocumentsLibraryPage() {
  const {
    fetchDocuments,
    isLoading,
    selectedDocId,
    selectDocument,
    getFilteredDocuments,
    getSelectedDocument,
  } = useDocumentsStore();

  const { drafts, createDraft, updateDraft, deleteDraft, exportDraft } =
    useLocalDrafts();

  const [activeView, setActiveView] = useState<"list" | "editor">("list");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const documents = getFilteredDocuments();
  const selectedDoc = getSelectedDocument();
  const activeDraft = drafts.find((d) => d.id === activeDraftId) ?? null;

  const handleNewDocument = () => {
    const draft = createDraft();
    setActiveDraftId(draft.id);
    setActiveView("editor");
  };

  const handleOpenDraft = (id: string) => {
    setActiveDraftId(id);
    setActiveView("editor");
  };

  const handleCloseEditor = () => {
    setActiveView("list");
    setActiveDraftId(null);
  };

  const handleDeleteDraft = (id: string) => {
    deleteDraft(id);
    if (activeDraftId === id) {
      handleCloseEditor();
    }
  };

  // Editor view
  if (activeView === "editor" && activeDraft) {
    return (
      <div className="flex h-full flex-col">
        <NewDocumentEditor
          draft={activeDraft}
          onUpdate={updateDraft}
          onExport={exportDraft}
          onDelete={handleDeleteDraft}
          onClose={handleCloseEditor}
        />
      </div>
    );
  }

  // Library view
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Document Library
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            All documents across vaults and workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleNewDocument}
            className="flex items-center gap-1.5 rounded-lg border border-accent-primary/40 bg-accent-primary/10 px-3 py-1.5 text-xs font-medium text-accent-primary transition-colors hover:border-accent-primary/70 hover:bg-accent-primary/20"
          >
            <Plus size={13} />
            New Document
          </button>
          <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-400">
            Documents
          </span>
        </div>
      </div>

      {/* Local Drafts section */}
      {drafts.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Local Drafts
          </h2>
          <div className="flex flex-col divide-y divide-surface-border rounded-lg border border-surface-border overflow-hidden">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center gap-3 bg-surface-raised px-4 py-2.5 transition-colors hover:bg-surface-overlay"
              >
                <Pencil size={13} className="shrink-0 text-text-muted" />
                <span className="flex-1 truncate text-sm text-text-primary">
                  {draft.title}
                </span>
                <span className="rounded-full bg-chamber-review/15 px-2 py-0.5 text-[10px] font-medium text-chamber-review">
                  Draft
                </span>
                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Clock size={10} />
                  {formatRelativeDate(draft.updatedAt)}
                </span>
                <button
                  onClick={() => handleOpenDraft(draft.id)}
                  className="rounded-md px-2 py-1 text-xs text-accent-primary transition-colors hover:bg-accent-primary/10"
                >
                  Open
                </button>
                <button
                  onClick={() => handleDeleteDraft(draft.id)}
                  title="Delete draft"
                  className="rounded-md p-1 text-text-muted transition-colors hover:bg-accent-danger/10 hover:text-accent-danger"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading documents...</p>
        </div>
      ) : (
        <div className="flex gap-4">
          <div className={selectedDoc ? "flex-1 min-w-0" : "w-full"}>
            <DocumentsTable
              documents={documents}
              selectedId={selectedDocId}
              onSelect={selectDocument}
            />
          </div>
          {selectedDoc && (
            <div className="w-[360px] flex-shrink-0">
              <DocumentPreview
                document={selectedDoc}
                onClose={() => selectDocument(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
