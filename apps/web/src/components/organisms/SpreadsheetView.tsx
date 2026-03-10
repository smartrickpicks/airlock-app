"use client";

import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import type { Document } from "@/lib/mock-documents";
import { formatFileSize } from "@/lib/mock-documents";

interface SpreadsheetViewProps {
  documents: Document[];
}

export default function SpreadsheetView({ documents }: SpreadsheetViewProps) {
  const headers = [
    "Title",
    "File Name",
    "Format",
    "Type",
    "Status",
    "Size",
    "Uploaded By",
    "Vault",
    "Updated",
  ];

  const headerCells = headers.map((h, colIndex) => ({
    r: 0,
    c: colIndex,
    v: { v: h, m: h, bl: 1 as const },
  }));

  const celldata = documents.flatMap((doc, rowIndex) => {
    const row = rowIndex + 1;
    const cells = [
      doc.title,
      doc.fileName,
      doc.fileFormat.toUpperCase(),
      doc.documentType,
      doc.status,
      formatFileSize(doc.fileSizeBytes),
      doc.uploadedByName,
      doc.vaultName || "\u2014",
      new Date(doc.updatedAt).toLocaleDateString(),
    ];
    return cells.map((value, colIndex) => ({
      r: row,
      c: colIndex,
      v: { v: value, m: String(value) },
    }));
  });

  const sheetData = [
    {
      name: "Documents",
      celldata: [...headerCells, ...celldata],
      config: {
        columnlen: {
          "0": 220,
          "1": 200,
          "2": 60,
          "3": 90,
          "4": 70,
          "5": 80,
          "6": 100,
          "7": 140,
          "8": 100,
        },
      },
      row: documents.length + 1,
      column: 9,
    },
  ];

  return (
    <div className="h-[500px] rounded-lg border border-surface-border overflow-hidden">
      <Workbook
        data={sheetData}
        showToolbar={false}
        showFormulaBar={false}
        showSheetTabs={false}
      />
    </div>
  );
}
