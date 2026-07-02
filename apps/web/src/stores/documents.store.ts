import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_DOCUMENTS,
  type Document,
  type DocumentType,
  type DocumentStatus,
  type FileFormat,
} from "@/lib/mock-documents";
import { mergeDemoDocuments } from "@/stores/demo-lifecycle.store";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface DocumentFilters {
  documentType: DocumentType | "all";
  status: DocumentStatus | "all";
  fileFormat: FileFormat | "all";
  moduleSource: string | "all";
  search: string;
}

interface DocumentsState {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  filters: DocumentFilters;
  selectedDocId: string | null;

  fetchDocuments: () => Promise<void>;
  addDocument: (document: Document) => void;
  setFilter: <K extends keyof DocumentFilters>(
    key: K,
    value: DocumentFilters[K],
  ) => void;
  resetFilters: () => void;
  selectDocument: (id: string | null) => void;
  getFilteredDocuments: () => Document[];
  getSelectedDocument: () => Document | null;
}

const DEFAULT_FILTERS: DocumentFilters = {
  documentType: "all",
  status: "all",
  fileFormat: "all",
  moduleSource: "all",
  search: "",
};

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documents: [],
  isLoading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  selectedDocId: null,

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ documents: Document[] }>(
        "/api/v1/documents",
      );
      const merged = mergeDemoDocuments(data.documents);
      set({
        documents: merged,
        selectedDocId: merged[0]?.id ?? null,
        isLoading: false,
      });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({
          documents: [],
          selectedDocId: null,
          isLoading: false,
          error: null,
        });
      } else {
        const merged = mergeDemoDocuments(MOCK_DOCUMENTS);
        set({
          documents: merged,
          selectedDocId: merged[0]?.id ?? null,
          isLoading: false,
          error: null,
        });
      }
    }
  },

  addDocument: (document) =>
    set((state) => ({
      documents: [document, ...state.documents],
      selectedDocId: document.id,
    })),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  selectDocument: (id) => set({ selectedDocId: id }),

  getFilteredDocuments: () => {
    const { documents, filters } = get();
    return documents.filter((d) => {
      if (
        filters.documentType !== "all" &&
        d.documentType !== filters.documentType
      )
        return false;
      if (filters.status !== "all" && d.status !== filters.status) return false;
      if (filters.fileFormat !== "all" && d.fileFormat !== filters.fileFormat)
        return false;
      if (
        filters.moduleSource !== "all" &&
        d.moduleSource !== filters.moduleSource
      )
        return false;
      if (
        filters.search &&
        !d.title.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      return true;
    });
  },

  getSelectedDocument: () => {
    const { documents, selectedDocId } = get();
    if (!selectedDocId) return null;
    return documents.find((d) => d.id === selectedDocId) || null;
  },
}));
