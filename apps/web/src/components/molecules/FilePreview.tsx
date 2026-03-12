"use client";

import { FileText, Image as ImageIcon, File, Download } from "lucide-react";

interface FilePreviewProps {
  fileName: string;
  fileSize?: number;
  fileUrl?: string;
  fileMimeType?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType?: string) {
  if (mimeType?.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

export default function FilePreview({
  fileName,
  fileSize,
  fileUrl,
  fileMimeType,
}: FilePreviewProps) {
  const Icon = getFileIcon(fileMimeType);
  const isImage = fileMimeType?.startsWith("image/");

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised overflow-hidden max-w-[260px]">
      {isImage && fileUrl && (
        <img
          src={fileUrl}
          alt={fileName}
          className="w-full max-h-[200px] object-cover"
        />
      )}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-surface-overlay">
          <Icon size={16} className="text-text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-text-primary truncate">
            {fileName}
          </p>
          {fileSize != null && (
            <p className="text-[10px] text-text-muted">
              {formatFileSize(fileSize)}
            </p>
          )}
        </div>
        {fileUrl && (
          <a
            href={fileUrl}
            download={fileName}
            className="flex-shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Download"
          >
            <Download size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
