import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  runExtractionEngine,
  runPreflightEngine,
  type EngineExtractionResponse,
  type EnginePreflightResponse,
} from "@/lib/contract-engines";
import type { Vault } from "@/stores/vault.store";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface IntakeDocument {
  id: string;
  filename: string;
  file_format: string;
  status: string;
  full_text: string | null;
  page_count: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface DocumentUploadResponse {
  document: IntakeDocument;
  parsed: boolean;
}

interface CreateVaultFromDocumentResponse extends Vault {}

type IntakeStep =
  | "idle"
  | "upload"
  | "parsing"
  | "preflight"
  | "extraction"
  | "done"
  | "failed";

interface IntakeState {
  document: IntakeDocument | null;
  vault: Vault | null;
  intakeStep: IntakeStep;
  isUploading: boolean;
  error: string | null;
  preflight: EnginePreflightResponse | null;
  extraction: EngineExtractionResponse | null;

  reset: () => void;
  uploadDocument: (file: File) => Promise<void>;
  createVaultFromDocument: (name: string) => Promise<Vault>;
}

function splitTextIntoPages(fullText: string): Array<{
  page: number;
  text: string;
  char_count: number;
  image_coverage_ratio: number;
}> {
  const size = 3000;
  const chunks: string[] = [];
  for (let index = 0; index < fullText.length; index += size) {
    chunks.push(fullText.slice(index, index + size));
  }
  return (chunks.length ? chunks : [fullText]).map((text, index) => ({
    page: index + 1,
    text,
    char_count: text.length,
    image_coverage_ratio: 0.05,
  }));
}

export const useIntakeStore = create<IntakeState>((set, get) => ({
  document: null,
  vault: null,
  intakeStep: "idle",
  isUploading: false,
  error: null,
  preflight: null,
  extraction: null,

  reset: () =>
    set({
      document: null,
      vault: null,
      intakeStep: "idle",
      isUploading: false,
      error: null,
      preflight: null,
      extraction: null,
    }),

  uploadDocument: async (file) => {
    set({
      isUploading: true,
      vault: null,
      intakeStep: "upload",
      error: null,
      preflight: null,
      extraction: null,
    });

    try {
      let uploadResult: DocumentUploadResponse;

      try {
        const body = new FormData();
        body.append("file", file);
        body.append("document_type", "contract");

        uploadResult = await apiFetch<DocumentUploadResponse>(
          "/api/v1/documents/upload",
          { method: "POST", body },
        );
      } catch (uploadError) {
        // Log the actual error so we can debug — silent swallowing hides real issues
        console.warn(
          "[intake] Upload API failed, using mock fallback:",
          uploadError,
        );
        const mockText = `[Mock parsed content for: ${file.name}]\n\nThis is a simulated extraction. The API is not running. Upload a real PDF with the API active to get live parsed text.\n\nDistribution Agreement\nEffective Date: January 15, 2026\nTerritory: Worldwide\nExclusive: Yes\nDistribution Fee: 15%`;
        uploadResult = {
          document: {
            id: `doc_mock_${Date.now()}`,
            filename: file.name,
            file_format: "pdf",
            status: "parsed",
            full_text: mockText,
            page_count: Math.max(1, Math.round(file.size / 3000)),
            metadata: {},
            created_at: new Date().toISOString(),
          },
          parsed: true,
        };
      }

      set({
        document: uploadResult.document,
        intakeStep: uploadResult.parsed ? "parsing" : "failed",
      });

      if (!uploadResult.parsed || !uploadResult.document.full_text) {
        const parseError =
          typeof uploadResult.document.metadata?.parse_error === "string"
            ? uploadResult.document.metadata.parse_error
            : "PDF parsing failed.";
        set({
          isUploading: false,
          error: parseError,
          intakeStep: "failed",
        });
        return;
      }

      const pagesData = splitTextIntoPages(uploadResult.document.full_text);

      set({ intakeStep: "preflight" });
      const preflight = await runPreflightEngine({
        fullText: uploadResult.document.full_text,
        pagesData,
        targetCodes: [],
      });

      set({ preflight, intakeStep: "extraction" });
      const extraction = await runExtractionEngine({
        fullText: uploadResult.document.full_text,
        pagesData,
        targetCodes: [],
      });

      set({
        extraction,
        intakeStep: "done",
        isUploading: false,
        error: null,
      });
    } catch (error) {
      set({
        isUploading: false,
        intakeStep: "failed",
        error:
          error instanceof Error ? error.message : "Document intake failed.",
      });
    }
  },

  createVaultFromDocument: async (name): Promise<Vault> => {
    const state = get();
    if (!state.document) {
      throw new Error("Upload a document before creating a vault.");
    }
    if (!state.preflight || !state.extraction) {
      throw new Error("Run preflight and extraction before creating a vault.");
    }

    const metadata: Record<string, unknown> = {
      intake_source: "pdf_upload",
      preflight_result: state.preflight,
      extraction_result: state.extraction,
    };

    const detectedType =
      state.preflight.contract_classification?.normalized_contract_type;
    if (detectedType) {
      metadata.contract_type = detectedType;
    }

    let vault: Vault;
    try {
      vault = await apiFetch<CreateVaultFromDocumentResponse>(
        "/api/v1/vaults/from-document",
        {
          method: "POST",
          body: JSON.stringify({
            document_id: state.document.id,
            name,
            metadata,
          }),
        },
      );
    } catch {
      // API not running — create a local mock vault
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      vault = {
        id: `vault_mock_${Date.now()}`,
        name,
        slug,
        module_type: "contracts",
        vault_type: "contract",
        vault_level: 4 as const,
        parent_vault_id: null,
        chamber: "discover",
        gate: null,
        health_score: state.preflight?.health_score?.calibrated_score
          ? Math.round(state.preflight.health_score.calibrated_score * 100)
          : 50,
        workspace_id: "ws_default",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
        metadata,
      };

      // Add to vault store so it appears in the sidebar
      const { useVaultStore } = await import("@/stores/vault.store");
      useVaultStore.getState().addVault(vault);
    }

    set({ vault });
    return vault;
  },
}));
