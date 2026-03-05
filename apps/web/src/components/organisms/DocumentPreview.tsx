"use client";

import type { Document } from "@/lib/mock-documents";
import {
  DOC_TYPE_LABELS,
  DOC_STATUS_CONFIG,
  FORMAT_ICONS,
  formatFileSize,
} from "@/lib/mock-documents";

interface DocumentPreviewProps {
  document: Document;
  onClose: () => void;
}

export default function DocumentPreview({
  document,
  onClose,
}: DocumentPreviewProps) {
  const fmt = FORMAT_ICONS[document.fileFormat];
  const statusCfg = DOC_STATUS_CONFIG[document.status];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-surface-border bg-surface-raised p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg bg-surface-overlay text-sm font-bold ${fmt.color}`}
          >
            {fmt.label}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {document.title}
            </h3>
            <p className="text-xs text-text-muted">{document.fileName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-surface-overlay p-1.5 text-xs text-text-muted hover:bg-surface-border hover:text-text-primary transition-colors"
        >
          Close
        </button>
      </div>

      {/* Preview placeholder */}
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-sunken/30">
        <div className="text-center">
          <span className={`text-3xl font-bold ${fmt.color}`}>{fmt.label}</span>
          <p className="mt-2 text-sm text-text-muted">
            Preview available when TipTap / PDF.js is integrated
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {formatFileSize(document.fileSizeBytes)}
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3">
        <MetaField
          label="Type"
          value={DOC_TYPE_LABELS[document.documentType]}
        />
        <MetaField label="Status">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusCfg.color.split(" ")[0]}`}
            />
            <span>{statusCfg.label}</span>
          </span>
        </MetaField>
        <MetaField label="Version" value={`v${document.version}`} />
        <MetaField
          label="Size"
          value={formatFileSize(document.fileSizeBytes)}
        />
        <MetaField label="Vault" value={document.vaultName || "Workspace"} />
        <MetaField label="Module" value={document.moduleSource} />
        <MetaField label="Uploaded by" value={document.uploadedByName} />
        <MetaField
          label="Last updated"
          value={new Date(document.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        />
      </div>
    </div>
  );
}

function MetaField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs text-text-secondary">
        {children || value}
      </dd>
    </div>
  );
}
