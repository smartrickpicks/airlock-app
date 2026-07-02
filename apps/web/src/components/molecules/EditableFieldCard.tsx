"use client";

import { useState, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import StatusDot from "@/components/atoms/StatusDot";
import ConfidenceBadge from "@/components/atoms/ConfidenceBadge";
import type { ExtractionField } from "@/lib/mock-extractions";

interface EditableFieldCardProps {
  field: ExtractionField;
  editedValue?: string;
  onFieldEdit: (fieldKey: string, newValue: string) => void;
}

export default function EditableFieldCard({
  field,
  editedValue,
  onFieldEdit,
}: EditableFieldCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(editedValue ?? field.extracted_value);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEdited =
    editedValue !== undefined && editedValue !== field.extracted_value;
  const displayValue = editedValue ?? field.extracted_value;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onFieldEdit(field.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(displayValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <div
      className={`rounded-md border border-surface-border bg-surface-overlay transition-colors duration-fast ${
        isEdited ? "border-l-2 border-l-chamber-build" : ""
      }`}
    >
      <div className="flex w-full items-center gap-3 px-3 py-2.5">
        <StatusDot status={field.status} />

        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">
          {field.field_name}
        </span>

        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-[200px] rounded border border-chamber-build/50 bg-surface-sunken px-2 py-1 font-mono text-xs text-text-primary outline-none focus:border-chamber-build"
            />
            <button
              onClick={handleSave}
              className="rounded p-1 text-gate-green transition-colors hover:bg-gate-green/10"
              title="Save"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleCancel}
              className="rounded p-1 text-gate-red transition-colors hover:bg-gate-red/10"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setDraft(displayValue);
              setIsEditing(true);
            }}
            className="group flex cursor-pointer items-center gap-1.5"
            title="Click to edit"
          >
            <span className="max-w-[200px] truncate text-right font-mono text-xs text-text-secondary">
              {displayValue}
            </span>
            <Pencil
              size={12}
              className="text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
            />
          </button>
        )}

        <ConfidenceBadge tier={field.confidence_tier} />

        {isEdited && (
          <span className="rounded-sm bg-chamber-build/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-chamber-build">
            EDITED
          </span>
        )}
      </div>
    </div>
  );
}
