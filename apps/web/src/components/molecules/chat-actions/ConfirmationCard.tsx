"use client";

import { useState } from "react";

interface ConfirmationField {
  label: string;
  value: string;
  editable?: boolean;
}

interface ConfirmationCardProps {
  title: string;
  description?: string;
  fields: ConfirmationField[];
  onConfirm: (fields: Record<string, string>) => void;
  onCancel: () => void;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export default function ConfirmationCard({
  title,
  description,
  fields,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  isDestructive = false,
}: ConfirmationCardProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.label, f.value])),
  );
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm(values);
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && (
        <p className="mt-0.5 text-[11px] text-text-muted">{description}</p>
      )}

      <div className="mt-3 space-y-2">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="text-[10px] font-mono text-text-muted uppercase">
              {field.label}
            </label>
            {field.editable && !confirmed ? (
              <input
                type="text"
                value={values[field.label] || ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.label]: e.target.value }))
                }
                className="mt-0.5 w-full rounded border border-surface-border bg-surface-overlay px-2 py-1 text-sm text-text-primary focus:border-[#00D1FF] focus:outline-none"
              />
            ) : (
              <p className="text-sm text-text-secondary">
                {values[field.label]}
              </p>
            )}
          </div>
        ))}
      </div>

      {!confirmed && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleConfirm}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-colors ${
              isDestructive
                ? "bg-accent-danger hover:bg-accent-danger/80"
                : "bg-[#00D1FF] hover:bg-[#00D1FF]/80"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-surface-border px-3 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {confirmed && (
        <p className="mt-2 text-[11px] text-accent-success font-medium">
          Confirmed
        </p>
      )}
    </div>
  );
}
