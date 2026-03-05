"use client";

import { useState } from "react";
import type { ExtractionField } from "@/lib/mock-extractions";

interface PatchEditorProps {
  fields: ExtractionField[];
  onSaveDraft: (data: {
    field_name: string;
    current_value: string;
    proposed_value: string;
    intent: string;
    because_clause: string;
  }) => void;
  onCancel: () => void;
}

export default function PatchEditor({
  fields,
  onSaveDraft,
  onCancel,
}: PatchEditorProps) {
  const [selectedField, setSelectedField] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [intent, setIntent] = useState("");
  const [becauseClause, setBecauseClause] = useState("");

  const currentField = fields.find((f) => f.field_name === selectedField);

  const canSubmit =
    selectedField &&
    proposedValue.trim() &&
    intent.trim() &&
    becauseClause.trim();

  const handleSubmit = () => {
    if (!canSubmit || !currentField) return;
    onSaveDraft({
      field_name: selectedField,
      current_value: currentField.extracted_value,
      proposed_value: proposedValue,
      intent,
      because_clause: becauseClause,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
        New Patch
      </h3>

      {/* Field selector */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Field to Patch
        </label>
        <select
          value={selectedField}
          onChange={(e) => {
            setSelectedField(e.target.value);
            setProposedValue("");
          }}
          className="w-full rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="">Select a field...</option>
          {fields.map((f) => (
            <option key={f.id} value={f.field_name}>
              {f.field_name}
            </option>
          ))}
        </select>
      </div>

      {/* Current value (read-only) */}
      {currentField && (
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Current Value
          </label>
          <div className="rounded-md bg-surface-sunken px-3 py-2 font-mono text-sm text-text-muted">
            {currentField.extracted_value}
          </div>
        </div>
      )}

      {/* Proposed value */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Proposed Value
        </label>
        <input
          type="text"
          value={proposedValue}
          onChange={(e) => setProposedValue(e.target.value)}
          placeholder="Enter the corrected value"
          className="w-full rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          disabled={!selectedField}
        />
      </div>

      {/* Intent */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Intent
        </label>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="What are you changing and why?"
          rows={2}
          className="w-full resize-none rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      {/* Because clause */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Because
        </label>
        <textarea
          value={becauseClause}
          onChange={(e) => setBecauseClause(e.target.value)}
          placeholder="Explain the business rationale for this change..."
          rows={3}
          className="w-full resize-none rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save Draft
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-overlay"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
