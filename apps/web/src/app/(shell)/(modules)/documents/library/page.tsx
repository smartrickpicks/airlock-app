"use client";

import { useEffect } from "react";
import { useDocumentsStore } from "@/stores/documents.store";
import DocumentsTable from "@/components/organisms/DocumentsTable";
import DocumentPreview from "@/components/organisms/DocumentPreview";

export default function DocumentsLibraryPage() {
  const {
    fetchDocuments,
    isLoading,
    selectedDocId,
    selectDocument,
    getFilteredDocuments,
    getSelectedDocument,
  } = useDocumentsStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const documents = getFilteredDocuments();
  const selectedDoc = getSelectedDocument();

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Document Library
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            All documents across vaults and workspace
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-primary">
          Documents
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading documents...</p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Table */}
          <div className={selectedDoc ? "flex-1 min-w-0" : "w-full"}>
            <DocumentsTable
              documents={documents}
              selectedId={selectedDocId}
              onSelect={selectDocument}
            />
          </div>

          {/* Preview panel */}
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
