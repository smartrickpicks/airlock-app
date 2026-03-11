"use client";

import { useEffect, useState, useCallback } from "react";
import { FileEdit, ChevronDown, ChevronRight } from "lucide-react";
import { useExtractionStore } from "@/stores/extraction.store";
import { usePatchStore } from "@/stores/patch.store";
import EditableFieldCard from "@/components/molecules/EditableFieldCard";
import type { ExtractionField } from "@/lib/mock-extractions";

interface BuildFieldEditorProps {
  vaultId: string;
}

interface SectionData {
  name: string;
  weight: number;
  fields: ExtractionField[];
}

function EditableSection({
  section,
  edits,
  onFieldEdit,
}: {
  section: SectionData;
  edits: Map<string, string>;
  onFieldEdit: (fieldKey: string, newValue: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const editedInSection = section.fields.filter((f) => {
    const edited = edits.get(f.id);
    return edited !== undefined && edited !== f.extracted_value;
  }).length;

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-surface-overlay"
      >
        {collapsed ? (
          <ChevronRight size={16} className="text-text-muted" />
        ) : (
          <ChevronDown size={16} className="text-text-muted" />
        )}
        <span className="text-sm font-semibold text-text-primary">
          {section.name}
        </span>
        <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          {Math.round(section.weight * 100)}%
        </span>
        {editedInSection > 0 && (
          <span className="ml-auto rounded-sm bg-chamber-build/20 px-1.5 py-0.5 text-[10px] font-bold text-chamber-build">
            {editedInSection} edited
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="mt-1 flex flex-col gap-1.5 pl-2">
          {section.fields.map((field) => (
            <EditableFieldCard
              key={field.id}
              field={field}
              editedValue={edits.get(field.id)}
              onFieldEdit={onFieldEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BuildFieldEditor({ vaultId }: BuildFieldEditorProps) {
  const { extraction, isLoading, fetchExtraction } = useExtractionStore();
  const { createDraft, isLoading: isPatchLoading } = usePatchStore();
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [draftCreated, setDraftCreated] = useState(false);

  useEffect(() => {
    fetchExtraction(vaultId);
  }, [vaultId, fetchExtraction]);

  const handleFieldEdit = useCallback((fieldKey: string, newValue: string) => {
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(fieldKey, newValue);
      return next;
    });
    setDraftCreated(false);
  }, []);

  // Count actual edits (value differs from original)
  const allFields = extraction?.sections.flatMap((s) => s.fields) ?? [];
  const editedCount = allFields.filter((f) => {
    const edited = edits.get(f.id);
    return edited !== undefined && edited !== f.extracted_value;
  }).length;

  const handleCreateDraft = async () => {
    // Create one patch per edited field
    const editedFields = allFields.filter((f) => {
      const edited = edits.get(f.id);
      return edited !== undefined && edited !== f.extracted_value;
    });

    for (const field of editedFields) {
      const newValue = edits.get(field.id)!;
      await createDraft(vaultId, {
        field_name: field.field_name,
        current_value: field.extracted_value,
        proposed_value: newValue,
        intent: "Field correction during Build",
        because_clause: `Updated "${field.field_name}" from "${field.extracted_value}" to "${newValue}"`,
      });
    }
    setDraftCreated(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-md bg-surface-overlay"
          />
        ))}
      </div>
    );
  }

  if (!extraction) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">
          No extraction data available for this vault.
        </p>
      </div>
    );
  }

  const totalFields = extraction.sections.reduce(
    (sum, s) => sum + s.fields.length,
    0,
  );

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
        <div className="flex items-center gap-2">
          <FileEdit size={14} className="text-chamber-build" />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Build Editor
          </span>
          <span className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
            {totalFields} fields
          </span>
          {editedCount > 0 && (
            <span className="rounded-sm bg-chamber-build/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-chamber-build">
              {editedCount} edited
            </span>
          )}
        </div>
        <button
          onClick={handleCreateDraft}
          disabled={editedCount === 0 || isPatchLoading || draftCreated}
          className="flex items-center gap-1.5 rounded-md bg-chamber-build/15 px-3 py-1.5 text-xs font-semibold text-chamber-build transition-colors hover:bg-chamber-build/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPatchLoading
            ? "Creating..."
            : draftCreated
              ? "Draft Created"
              : "Create Draft"}
        </button>
      </div>

      {/* Editable sections */}
      <div className="flex-1 overflow-y-auto p-4">
        {extraction.sections.map((section) => (
          <EditableSection
            key={section.name}
            section={section}
            edits={edits}
            onFieldEdit={handleFieldEdit}
          />
        ))}
      </div>
    </div>
  );
}
