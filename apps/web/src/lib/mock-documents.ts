/**
 * Mock Documents data — file list for the Documents module.
 * Documents are attached to vaults or standalone workspace files.
 * Remove this file once the API + Postgres are available.
 */

// --- Types ---

export type DocumentType =
  | "contract"
  | "amendment"
  | "nda"
  | "proposal"
  | "report"
  | "policy"
  | "template"
  | "other";
export type DocumentStatus = "draft" | "final" | "archived";
export type FileFormat = "pdf" | "docx" | "xlsx" | "pptx" | "txt" | "md";

export interface Document {
  id: string;
  title: string;
  fileName: string;
  fileFormat: FileFormat;
  fileSizeBytes: number;
  documentType: DocumentType;
  status: DocumentStatus;
  vaultSlug: string | null;
  vaultName: string | null;
  moduleSource: "contracts" | "crm" | "tasks" | "documents";
  uploadedBy: string;
  uploadedByName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// --- Config ---

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  contract: "Contract",
  amendment: "Amendment",
  nda: "NDA",
  proposal: "Proposal",
  report: "Report",
  policy: "Policy",
  template: "Template",
  other: "Other",
};

export const DOC_STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; color: string }
> = {
  draft: { label: "Draft", color: "bg-gate-yellow text-gate-yellow" },
  final: { label: "Final", color: "bg-gate-green text-gate-green" },
  archived: { label: "Archived", color: "bg-surface-border text-text-muted" },
};

export const FORMAT_ICONS: Record<
  FileFormat,
  { label: string; color: string }
> = {
  pdf: { label: "PDF", color: "text-accent-danger" },
  docx: { label: "DOCX", color: "text-accent-primary" },
  xlsx: { label: "XLSX", color: "text-chamber-ship" },
  pptx: { label: "PPTX", color: "text-amber-400" },
  txt: { label: "TXT", color: "text-text-muted" },
  md: { label: "MD", color: "text-text-secondary" },
};

// --- Helpers ---

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Mock documents (18 total) ---

export const MOCK_DOCUMENTS: Document[] = [
  // Contracts vault docs
  {
    id: "doc_001",
    title: "Henderson MSA — Master Agreement",
    fileName: "henderson-msa-v3.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 2_450_000,
    documentType: "contract",
    status: "final",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    moduleSource: "contracts",
    uploadedBy: "user_001",
    uploadedByName: "Ana Chen",
    version: 3,
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-03-04T14:00:00Z",
  },
  {
    id: "doc_002",
    title: "Henderson MSA — Redline Draft",
    fileName: "henderson-msa-redline.docx",
    fileFormat: "docx",
    fileSizeBytes: 1_800_000,
    documentType: "contract",
    status: "draft",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    moduleSource: "contracts",
    uploadedBy: "user_001",
    uploadedByName: "Ana Chen",
    version: 1,
    createdAt: "2026-03-04T11:00:00Z",
    updatedAt: "2026-03-04T11:00:00Z",
  },
  {
    id: "doc_003",
    title: "Nova Entertainment MSA",
    fileName: "nova-msa-signed.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 3_100_000,
    documentType: "contract",
    status: "final",
    vaultSlug: "nova-msa",
    vaultName: "Nova Entertainment MSA",
    moduleSource: "contracts",
    uploadedBy: "user_002",
    uploadedByName: "David Park",
    version: 2,
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-28T16:00:00Z",
  },
  {
    id: "doc_004",
    title: "Summit Distribution Agreement",
    fileName: "summit-dist-agreement.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 2_800_000,
    documentType: "contract",
    status: "final",
    vaultSlug: "summit-dist",
    vaultName: "Summit Distribution",
    moduleSource: "contracts",
    uploadedBy: "user_003",
    uploadedByName: "Sarah Miller",
    version: 1,
    createdAt: "2025-12-10T10:00:00Z",
    updatedAt: "2025-12-10T10:00:00Z",
  },
  {
    id: "doc_005",
    title: "TechFlow NDA",
    fileName: "techflow-nda-v1.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 450_000,
    documentType: "nda",
    status: "draft",
    vaultSlug: "techflow-nda",
    vaultName: "TechFlow NDA",
    moduleSource: "contracts",
    uploadedBy: "user_002",
    uploadedByName: "David Park",
    version: 1,
    createdAt: "2026-03-05T07:00:00Z",
    updatedAt: "2026-03-05T07:00:00Z",
  },
  {
    id: "doc_006",
    title: "Ostereo Music MSA",
    fileName: "ostereo-msa-final.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 2_200_000,
    documentType: "contract",
    status: "final",
    vaultSlug: "ostereo-msa",
    vaultName: "Ostereo Music MSA",
    moduleSource: "contracts",
    uploadedBy: "user_003",
    uploadedByName: "Sarah Miller",
    version: 4,
    createdAt: "2025-11-20T10:00:00Z",
    updatedAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "doc_007",
    title: "Warner Amendment",
    fileName: "warner-amendment-draft.docx",
    fileFormat: "docx",
    fileSizeBytes: 980_000,
    documentType: "amendment",
    status: "draft",
    vaultSlug: "warner-amend",
    vaultName: "Warner Amendment",
    moduleSource: "contracts",
    uploadedBy: "user_001",
    uploadedByName: "Ana Chen",
    version: 2,
    createdAt: "2026-03-03T11:00:00Z",
    updatedAt: "2026-03-05T08:00:00Z",
  },
  // CRM docs
  {
    id: "doc_008",
    title: "Nova Proposal — Q1 Expansion",
    fileName: "nova-proposal-q1.pptx",
    fileFormat: "pptx",
    fileSizeBytes: 5_600_000,
    documentType: "proposal",
    status: "draft",
    vaultSlug: "henderson-msa",
    vaultName: "Henderson MSA",
    moduleSource: "crm",
    uploadedBy: "user_003",
    uploadedByName: "Sarah Miller",
    version: 1,
    createdAt: "2026-03-04T09:00:00Z",
    updatedAt: "2026-03-04T09:00:00Z",
  },
  {
    id: "doc_009",
    title: "Acme Inc Onboarding Pack",
    fileName: "acme-onboarding.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 1_200_000,
    documentType: "other",
    status: "final",
    vaultSlug: "acme-msa",
    vaultName: "Acme Inc MSA",
    moduleSource: "crm",
    uploadedBy: "user_001",
    uploadedByName: "Ana Chen",
    version: 1,
    createdAt: "2026-03-02T10:00:00Z",
    updatedAt: "2026-03-03T11:00:00Z",
  },
  // Standalone workspace docs
  {
    id: "doc_010",
    title: "Q1 Contract Metrics Report",
    fileName: "q1-contract-metrics.xlsx",
    fileFormat: "xlsx",
    fileSizeBytes: 340_000,
    documentType: "report",
    status: "draft",
    vaultSlug: null,
    vaultName: null,
    moduleSource: "documents",
    uploadedBy: "user_002",
    uploadedByName: "David Park",
    version: 1,
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "doc_011",
    title: "SLA Escalation Policy",
    fileName: "sla-policy-v2.md",
    fileFormat: "md",
    fileSizeBytes: 28_000,
    documentType: "policy",
    status: "draft",
    vaultSlug: null,
    vaultName: null,
    moduleSource: "documents",
    uploadedBy: "user_001",
    uploadedByName: "Ana Chen",
    version: 2,
    createdAt: "2026-02-14T14:00:00Z",
    updatedAt: "2026-03-05T09:30:00Z",
  },
  {
    id: "doc_012",
    title: "NDA Template — Standard",
    fileName: "nda-template-standard.docx",
    fileFormat: "docx",
    fileSizeBytes: 120_000,
    documentType: "template",
    status: "final",
    vaultSlug: null,
    vaultName: null,
    moduleSource: "documents",
    uploadedBy: "user_002",
    uploadedByName: "David Park",
    version: 5,
    createdAt: "2025-10-01T10:00:00Z",
    updatedAt: "2026-01-15T11:00:00Z",
  },
  {
    id: "doc_013",
    title: "MSA Template — Enterprise",
    fileName: "msa-template-enterprise.docx",
    fileFormat: "docx",
    fileSizeBytes: 250_000,
    documentType: "template",
    status: "final",
    vaultSlug: null,
    vaultName: null,
    moduleSource: "documents",
    uploadedBy: "user_002",
    uploadedByName: "David Park",
    version: 3,
    createdAt: "2025-09-15T10:00:00Z",
    updatedAt: "2026-02-01T14:00:00Z",
  },
  {
    id: "doc_014",
    title: "Distribution Template",
    fileName: "dist-template.docx",
    fileFormat: "docx",
    fileSizeBytes: 180_000,
    documentType: "template",
    status: "final",
    vaultSlug: null,
    vaultName: null,
    moduleSource: "documents",
    uploadedBy: "user_003",
    uploadedByName: "Sarah Miller",
    version: 2,
    createdAt: "2025-11-01T10:00:00Z",
    updatedAt: "2026-01-20T09:00:00Z",
  },
  {
    id: "doc_015",
    title: "Onboarding Checklist",
    fileName: "onboarding-checklist.md",
    fileFormat: "md",
    fileSizeBytes: 15_000,
    documentType: "other",
    status: "final",
    vaultSlug: null,
    vaultName: null,
    moduleSource: "documents",
    uploadedBy: "user_001",
    uploadedByName: "Ana Chen",
    version: 4,
    createdAt: "2025-08-01T10:00:00Z",
    updatedAt: "2026-03-02T10:00:00Z",
  },
  {
    id: "doc_016",
    title: "Team Meeting Notes — Mar 4",
    fileName: "meeting-notes-mar4.txt",
    fileFormat: "txt",
    fileSizeBytes: 8_500,
    documentType: "other",
    status: "final",
    vaultSlug: null,
    vaultName: null,
    moduleSource: "documents",
    uploadedBy: "user_003",
    uploadedByName: "Sarah Miller",
    version: 1,
    createdAt: "2026-03-04T16:00:00Z",
    updatedAt: "2026-03-04T16:00:00Z",
  },
  {
    id: "doc_017",
    title: "Preflight Rules Config — NDA",
    fileName: "preflight-nda-config.txt",
    fileFormat: "txt",
    fileSizeBytes: 4_200,
    documentType: "other",
    status: "draft",
    vaultSlug: null,
    vaultName: null,
    moduleSource: "tasks",
    uploadedBy: "user_002",
    uploadedByName: "David Park",
    version: 1,
    createdAt: "2026-03-04T08:00:00Z",
    updatedAt: "2026-03-04T08:00:00Z",
  },
  {
    id: "doc_018",
    title: "Extraction Config — Warner",
    fileName: "extraction-warner-config.txt",
    fileFormat: "txt",
    fileSizeBytes: 6_100,
    documentType: "other",
    status: "draft",
    vaultSlug: "warner-amend",
    vaultName: "Warner Amendment",
    moduleSource: "tasks",
    uploadedBy: "user_001",
    uploadedByName: "Ana Chen",
    version: 1,
    createdAt: "2026-03-03T11:00:00Z",
    updatedAt: "2026-03-03T11:00:00Z",
  },
];
