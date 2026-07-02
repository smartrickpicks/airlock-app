"use client";

import { useId, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

interface FileDropZoneProps {
  isBusy?: boolean;
  onFileSelected: (file: File) => void;
}

export default function FileDropZone({
  isBusy = false,
  onFileSelected,
}: FileDropZoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File | null) => {
    if (!file || isBusy) return;
    onFileSelected(file);
  };

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isBusy) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFile(event.dataTransfer.files?.[0] ?? null);
      }}
      className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition-colors ${
        isDragging
          ? "border-accent-primary bg-accent-primary/10"
          : "border-surface-border bg-surface-overlay hover:border-accent-primary/50"
      } ${isBusy ? "cursor-wait opacity-80" : ""}`}
      aria-label="Upload PDF document"
    >
      <input
        id={inputId}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        disabled={isBusy}
        onChange={(event) => {
          handleFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      {isBusy ? (
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      ) : (
        <FileUp className="h-8 w-8 text-accent-primary" />
      )}
      <div className="mt-4 text-base font-semibold text-text-primary">
        {isBusy ? "Processing PDF..." : "Drop a PDF here or click to upload"}
      </div>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Track B proof path: upload one contract PDF, parse it, run preflight,
        run extraction, and verify the real text is flowing through the system.
      </p>
    </label>
  );
}
