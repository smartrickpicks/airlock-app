"use client";

import { useState } from "react";
import Button from "@/components/atoms/Button";
import Modal from "@/components/molecules/Modal";
import type { DocumentType, FileFormat } from "@/lib/mock-documents";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "upload" | "drive";
  accounts?: Array<{ id: string; name: string }>;
  onUpload: (data: {
    title: string;
    fileName: string;
    documentType: DocumentType;
    fileFormat: FileFormat;
    moduleSource: "contracts" | "crm" | "tasks" | "documents";
    accountId: string | null;
    sourceLabel: "Local Upload" | "Google Drive Import";
  }) => void;
}

const DOCUMENT_TYPES: DocumentType[] = [
  "contract",
  "amendment",
  "nda",
  "proposal",
  "transcript",
  "brief",
  "report",
  "policy",
  "template",
  "other",
];

const FILE_FORMATS: FileFormat[] = ["pdf", "docx", "xlsx", "pptx", "txt", "md"];

export default function DocumentUploadModal({
  isOpen,
  onClose,
  mode = "upload",
  accounts = [],
  onUpload,
}: DocumentUploadModalProps) {
  const sourceLabel = mode === "drive" ? "Google Drive Import" : "Local Upload";
  const [title, setTitle] = useState(
    mode === "drive" ? "Northstar Source Packet" : "New Contract Intake Packet",
  );
  const [fileName, setFileName] = useState(
    mode === "drive"
      ? "northstar-source-packet.docx"
      : "new-contract-intake.pdf",
  );
  const [documentType, setDocumentType] = useState<DocumentType>(
    mode === "drive" ? "brief" : "contract",
  );
  const [fileFormat, setFileFormat] = useState<FileFormat>(
    mode === "drive" ? "docx" : "pdf",
  );
  const [moduleSource, setModuleSource] = useState<
    "contracts" | "crm" | "tasks" | "documents"
  >(mode === "drive" ? "crm" : "documents");
  const [accountId, setAccountId] = useState<string>("none");

  const inputClasses =
    "w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none";
  const labelClasses = "mb-1 block text-xs font-medium text-text-secondary";

  const handleUpload = () => {
    onUpload({
      title,
      fileName,
      documentType,
      fileFormat,
      moduleSource,
      accountId: accountId === "none" ? null : accountId,
      sourceLabel,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "drive" ? "Import from Google Drive" : "Upload Document"}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          {mode === "drive"
            ? "Demo Google Drive import. This creates a local artifact row and links it into the account story without implying a real provider sync."
            : "Demo upload flow. This creates a local document row so the library has a visible intake action before storage is wired."}
        </p>

        <div>
          <label htmlFor="doc-title" className={labelClasses}>
            Title
          </label>
          <input
            id="doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="doc-file" className={labelClasses}>
            File Name
          </label>
          <input
            id="doc-file"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="doc-type" className={labelClasses}>
              Type
            </label>
            <select
              id="doc-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className={inputClasses}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="doc-format" className={labelClasses}>
              Format
            </label>
            <select
              id="doc-format"
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value as FileFormat)}
              className={inputClasses}
            >
              {FILE_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="doc-module" className={labelClasses}>
            Source Module
          </label>
          <select
            id="doc-module"
            value={moduleSource}
            onChange={(e) =>
              setModuleSource(
                e.target.value as "contracts" | "crm" | "tasks" | "documents",
              )
            }
            className={inputClasses}
          >
            <option value="documents">Documents</option>
            <option value="contracts">Contracts</option>
            <option value="crm">CRM</option>
            <option value="tasks">Tasks</option>
          </select>
        </div>

        <div>
          <label htmlFor="doc-account" className={labelClasses}>
            Attach to Account
          </label>
          <select
            id="doc-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={inputClasses}
          >
            <option value="none">Workspace only</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-overlay p-3 text-xs text-text-secondary">
          Source label:{" "}
          <span className="font-medium text-text-primary">{sourceLabel}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleUpload}>Add to Library</Button>
        </div>
      </div>
    </Modal>
  );
}
