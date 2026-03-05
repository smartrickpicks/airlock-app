"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    entity: string;
    contractType: string;
    chamber: string;
  }) => void;
}

const CONTRACT_TYPES = ["MSA", "NDA", "Amendment", "Distribution", "License"];
const CHAMBERS = [
  { value: "discover", label: "Discover" },
  { value: "build", label: "Build" },
  { value: "review", label: "Review" },
  { value: "ship", label: "Ship" },
];

export default function CreateVaultModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateVaultModalProps) {
  const [name, setName] = useState("");
  const [entity, setEntity] = useState("");
  const [contractType, setContractType] = useState(CONTRACT_TYPES[0]);
  const [chamber, setChamber] = useState("discover");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setEntity("");
      setContractType(CONTRACT_TYPES[0]);
      setChamber("discover");
      // Focus name input after render
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      entity: entity.trim(),
      contractType,
      chamber,
    });
  };

  const inputClasses =
    "w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary";

  const labelClasses = "block text-xs font-medium text-text-secondary mb-1";

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60"
      onClick={onClose}
      aria-label="Modal backdrop"
    >
      <div
        className="w-full max-w-md rounded-lg border border-surface-border bg-surface-raised p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Create New Vault
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors duration-fast hover:bg-surface-overlay hover:text-text-primary"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vault Name */}
          <div>
            <label htmlFor="vault-name" className={labelClasses}>
              Vault Name <span className="text-accent-danger">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="vault-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distribution Agreement — Acme Records"
              className={inputClasses}
            />
          </div>

          {/* Entity */}
          <div>
            <label htmlFor="vault-entity" className={labelClasses}>
              Entity
            </label>
            <input
              id="vault-entity"
              type="text"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="e.g. Acme Records"
              className={inputClasses}
            />
          </div>

          {/* Contract Type */}
          <div>
            <label htmlFor="vault-contract-type" className={labelClasses}>
              Contract Type
            </label>
            <select
              id="vault-contract-type"
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className={inputClasses}
            >
              {CONTRACT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Chamber */}
          <div>
            <label htmlFor="vault-chamber" className={labelClasses}>
              Chamber
            </label>
            <select
              id="vault-chamber"
              value={chamber}
              onChange={(e) => setChamber(e.target.value)}
              className={inputClasses}
            >
              {CHAMBERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors duration-fast hover:bg-surface-overlay hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-fast hover:bg-accent-primary-hover"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
