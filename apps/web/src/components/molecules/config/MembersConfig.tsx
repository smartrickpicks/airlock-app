"use client";

import { useState } from "react";
import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

export default function MembersConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const [emails, setEmails] = useState<string[]>(
    (config.emails as string[]) ?? [],
  );
  const [input, setInput] = useState("");
  const [skipped, setSkipped] = useState(false);

  const canSave = emails.length > 0 || skipped;

  const addEmail = () => {
    const trimmed = input.trim();
    if (trimmed && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
      setInput("");
    }
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <div className="space-y-3 p-4">
      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-text-secondary">
          Invite Members
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="colleague@company.com"
            className="flex-1 rounded border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={addEmail}
            className="rounded bg-surface-raised px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-border hover:text-text-primary"
          >
            Add
          </button>
        </div>
      </div>

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {emails.map((email) => (
            <span
              key={email}
              className="flex items-center gap-1 rounded-full bg-surface-raised px-2.5 py-1 text-xs text-text-secondary"
            >
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="ml-0.5 text-text-muted hover:text-text-primary"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setSkipped(true)}
        className="text-xs text-text-muted underline hover:text-text-secondary"
      >
        Skip for now
      </button>

      <div className="flex justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-surface-border px-4 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave({ emails, skipped })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
