"use client";

import { useState } from "react";
import type {
  Document,
  DocumentStatus,
  FileFormat,
} from "@/lib/mock-documents";
import {
  DOC_TYPE_LABELS,
  DOC_STATUS_CONFIG,
  FORMAT_ICONS,
  formatFileSize,
} from "@/lib/mock-documents";

interface DocumentsTableProps {
  documents: Document[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type SortKey =
  | "title"
  | "fileFormat"
  | "documentType"
  | "status"
  | "updatedAt"
  | "fileSizeBytes";
type SortDir = "asc" | "desc";

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const QUICK_FILTERS = [
  { label: "All", value: "all" },
  { label: "Contracts", value: "contracts" },
  { label: "Templates", value: "templates" },
  { label: "Drafts", value: "drafts" },
  { label: "PDFs", value: "pdfs" },
] as const;

export default function DocumentsTable({
  documents,
  selectedId,
  onSelect,
}: DocumentsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeFilter, setActiveFilter] = useState("all");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Apply quick filter
  let filtered = documents;
  if (activeFilter === "contracts")
    filtered = filtered.filter((d) => d.documentType === "contract");
  if (activeFilter === "templates")
    filtered = filtered.filter((d) => d.documentType === "template");
  if (activeFilter === "drafts")
    filtered = filtered.filter((d) => d.status === "draft");
  if (activeFilter === "pdfs")
    filtered = filtered.filter((d) => d.fileFormat === "pdf");

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "title":
        return a.title.localeCompare(b.title) * dir;
      case "fileFormat":
        return a.fileFormat.localeCompare(b.fileFormat) * dir;
      case "documentType":
        return a.documentType.localeCompare(b.documentType) * dir;
      case "status":
        return a.status.localeCompare(b.status) * dir;
      case "fileSizeBytes":
        return (a.fileSizeBytes - b.fileSizeBytes) * dir;
      case "updatedAt":
        return (
          (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) *
          dir
        );
      default:
        return 0;
    }
  });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="cursor-pointer px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text-primary"
      onClick={() => toggleSort(field)}
    >
      {label}
      {sortKey === field && (
        <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Quick filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === f.value
                ? "bg-accent-primary text-text-inverse"
                : "bg-surface-overlay text-text-secondary hover:bg-surface-border hover:text-text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full">
          <thead className="bg-surface-overlay">
            <tr>
              <SortHeader label="Name" field="title" />
              <SortHeader label="Format" field="fileFormat" />
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Type
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Vault
              </th>
              <SortHeader label="Status" field="status" />
              <SortHeader label="Size" field="fileSizeBytes" />
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                By
              </th>
              <SortHeader label="Updated" field="updatedAt" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-12 text-center text-sm text-text-muted"
                >
                  No documents match the current filters
                </td>
              </tr>
            ) : (
              sorted.map((doc) => {
                const fmt = FORMAT_ICONS[doc.fileFormat];
                const statusCfg = DOC_STATUS_CONFIG[doc.status];
                const isSelected = doc.id === selectedId;

                return (
                  <tr
                    key={doc.id}
                    onClick={() => onSelect(doc.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-accent-primary/10"
                        : "hover:bg-surface-overlay/50"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${fmt.color}`}>
                          {fmt.label}
                        </span>
                        <span className="text-sm text-text-primary">
                          {doc.title}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-text-muted">
                        {doc.fileName}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${fmt.color}`}>
                        {fmt.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                      {DOC_TYPE_LABELS[doc.documentType]}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-muted">
                      {doc.vaultName || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex h-1.5 w-1.5 rounded-full ${statusCfg.color.split(" ")[0]}`}
                      />
                      <span className="ml-1.5 text-xs text-text-secondary">
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-muted font-mono">
                      {formatFileSize(doc.fileSizeBytes)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                      {doc.uploadedByName}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-muted">
                      {formatRelativeDate(doc.updatedAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
