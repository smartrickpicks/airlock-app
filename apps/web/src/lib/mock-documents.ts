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
  | "brief"
  | "transcript"
  | "other";
export type DocumentStatus = "draft" | "final" | "archived";
export type FileFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "txt"
  | "md"
  | "csv";

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
  relatedAccountId?: string | null;
  relatedAccountName?: string | null;
  sourceLabel?: string;
  signatureState?: string;
  lifecycleState?: string;
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
  brief: "Brief",
  transcript: "Transcript",
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
  csv: { label: "CSV", color: "text-chamber-ship" },
};

// --- Helpers ---

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Mock documents (15 total) ---

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc_001",
    title: "Empire Distribution Agreement — Nova Lux",
    fileName: "empire-nova-lux-distro.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 2_340_000,
    documentType: "contract",
    status: "final",
    vaultSlug: "nova-lux-empire-distro",
    vaultName: "Nova Lux — Empire Worldwide Distribution",
    moduleSource: "contracts",
    uploadedBy: "user_002",
    uploadedByName: "Kai Nakamura",
    version: 2,
    createdAt: "2026-01-20T10:00:00Z",
    updatedAt: "2026-03-08T14:00:00Z",
  },
  {
    id: "doc_002",
    title: "Nettwerk Sync License — Jay Solis",
    fileName: "nettwerk-jay-solis-sync.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 1_450_000,
    documentType: "contract",
    status: "draft",
    vaultSlug: "jay-solis-nettwerk-sync",
    vaultName: "Jay Solis — Nettwerk Sync License",
    moduleSource: "contracts",
    uploadedBy: "user_002",
    uploadedByName: "Kai Nakamura",
    version: 1,
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-10T14:00:00Z",
  },
  {
    id: "doc_003",
    title: "Redbull Brand Guidelines 2026",
    fileName: "redbull-brand-guidelines-2026.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 8_200_000,
    documentType: "brief",
    status: "final",
    vaultSlug: "portals-redbull-stage",
    vaultName: "The Portals — Redbull Sound Stage",
    moduleSource: "contracts",
    uploadedBy: "user_001",
    uploadedByName: "Luna Torres",
    version: 1,
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
  {
    id: "doc_004",
    title: "Urban Fauna EP — Track Listing & Metadata",
    fileName: "urban-fauna-track-listing.xlsx",
    fileFormat: "xlsx",
    fileSizeBytes: 85_000,
    documentType: "other",
    status: "final",
    vaultSlug: "barclay-awal-release",
    vaultName: "Barclay Crenshaw — AWAL Digital Release",
    moduleSource: "documents",
    uploadedBy: "user_004",
    uploadedByName: "Dex Rollins",
    version: 3,
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-03-05T14:00:00Z",
  },
  {
    id: "doc_005",
    title: "Midnight Concrete LP — Producer Agreement",
    fileName: "midnight-concrete-producer-agreement.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 1_780_000,
    documentType: "contract",
    status: "final",
    vaultSlug: "jay-solis-producer-agreement",
    vaultName: "Jay Solis — Producer Agreement (Dex Rollins)",
    moduleSource: "contracts",
    uploadedBy: "user_002",
    uploadedByName: "Kai Nakamura",
    version: 2,
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-03-02T14:00:00Z",
  },
  {
    id: "doc_006",
    title: "Glass Frequencies — Mastering Notes",
    fileName: "glass-frequencies-mastering-notes.docx",
    fileFormat: "docx",
    fileSizeBytes: 320_000,
    documentType: "other",
    status: "draft",
    vaultSlug: "nova-lux-empire-distro",
    vaultName: "Nova Lux — Empire Worldwide Distribution",
    moduleSource: "documents",
    uploadedBy: "user_004",
    uploadedByName: "Dex Rollins",
    version: 1,
    createdAt: "2026-03-08T10:00:00Z",
    updatedAt: "2026-03-11T14:00:00Z",
  },
  {
    id: "doc_007",
    title: "Boiler Room Performance License Template",
    fileName: "boiler-room-perf-license.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 980_000,
    documentType: "template",
    status: "draft",
    vaultSlug: "nova-lux-boiler-room",
    vaultName: "Nova Lux — Boiler Room Set Recording",
    moduleSource: "contracts",
    uploadedBy: "user_001",
    uploadedByName: "Luna Torres",
    version: 1,
    createdAt: "2026-03-06T10:00:00Z",
    updatedAt: "2026-03-06T10:00:00Z",
  },
  {
    id: "doc_008",
    title: "The Portals — Technical Rider",
    fileName: "portals-technical-rider.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 1_200_000,
    documentType: "brief",
    status: "final",
    vaultSlug: "portals-redbull-stage",
    vaultName: "The Portals — Redbull Sound Stage",
    moduleSource: "documents",
    uploadedBy: "user_004",
    uploadedByName: "Dex Rollins",
    version: 2,
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-03-04T14:00:00Z",
  },
  {
    id: "doc_009",
    title: "Barclay Crenshaw — Catalog Ownership Transfer",
    fileName: "barclay-catalog-transfer-draft.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 2_100_000,
    documentType: "contract",
    status: "draft",
    vaultSlug: "barclay-direct-distro",
    vaultName: "Barclay Crenshaw — Direct Distribution Deal",
    moduleSource: "contracts",
    uploadedBy: "user_002",
    uploadedByName: "Kai Nakamura",
    version: 1,
    createdAt: "2026-03-10T10:00:00Z",
    updatedAt: "2026-03-10T10:00:00Z",
  },
  {
    id: "doc_010",
    title: "AWAL Q1 2026 Royalty Statement",
    fileName: "awal-q1-2026-royalties.xlsx",
    fileFormat: "xlsx",
    fileSizeBytes: 145_000,
    documentType: "report",
    status: "final",
    vaultSlug: "barclay-awal-release",
    vaultName: "Barclay Crenshaw — AWAL Digital Release",
    moduleSource: "documents",
    uploadedBy: "user_003",
    uploadedByName: "Mia Okafor",
    version: 1,
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "doc_011",
    title: "Jay Solis — Netflix Placement Brief",
    fileName: "jay-solis-netflix-brief.docx",
    fileFormat: "docx",
    fileSizeBytes: 280_000,
    documentType: "brief",
    status: "final",
    vaultSlug: "jay-solis-nettwerk-sync",
    vaultName: "Jay Solis — Nettwerk Sync License",
    moduleSource: "documents",
    uploadedBy: "user_001",
    uploadedByName: "Luna Torres",
    version: 1,
    createdAt: "2026-03-05T10:00:00Z",
    updatedAt: "2026-03-09T14:00:00Z",
  },
  {
    id: "doc_012",
    title: "Orbit Records — Artist Roster Summary",
    fileName: "orbit-artist-roster-2026.xlsx",
    fileFormat: "xlsx",
    fileSizeBytes: 92_000,
    documentType: "report",
    status: "final",
    vaultSlug: null,
    vaultName: null,
    moduleSource: "documents",
    uploadedBy: "user_003",
    uploadedByName: "Mia Okafor",
    version: 4,
    createdAt: "2025-09-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "doc_013",
    title: "Nova Lux — Glass Frequencies Press Kit",
    fileName: "nova-lux-press-kit.pdf",
    fileFormat: "pdf",
    fileSizeBytes: 5_400_000,
    documentType: "brief",
    status: "final",
    vaultSlug: "nova-lux-empire-distro",
    vaultName: "Nova Lux — Empire Worldwide Distribution",
    moduleSource: "documents",
    uploadedBy: "user_001",
    uploadedByName: "Luna Torres",
    version: 2,
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-03-07T14:00:00Z",
  },
  {
    id: "doc_014",
    title: "The Portals — Redbull Sound Stage Proposal",
    fileName: "portals-redbull-proposal.pptx",
    fileFormat: "pptx",
    fileSizeBytes: 6_800_000,
    documentType: "proposal",
    status: "final",
    vaultSlug: "portals-redbull-stage",
    vaultName: "The Portals — Redbull Sound Stage",
    moduleSource: "crm",
    uploadedBy: "user_003",
    uploadedByName: "Mia Okafor",
    version: 1,
    createdAt: "2026-02-25T10:00:00Z",
    updatedAt: "2026-03-03T14:00:00Z",
  },
  {
    id: "doc_015",
    title: "Barclay Crenshaw — Post-Dirtybird Distribution Strategy",
    fileName: "barclay-post-dirtybird-strategy.docx",
    fileFormat: "docx",
    fileSizeBytes: 410_000,
    documentType: "other",
    status: "draft",
    vaultSlug: "barclay-direct-distro",
    vaultName: "Barclay Crenshaw — Direct Distribution Deal",
    moduleSource: "documents",
    uploadedBy: "user_self",
    uploadedByName: "You",
    version: 1,
    createdAt: "2026-03-10T10:00:00Z",
    updatedAt: "2026-03-12T10:00:00Z",
  },
];
