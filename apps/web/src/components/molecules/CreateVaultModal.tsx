"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/molecules/Modal";
import Button from "@/components/atoms/Button";

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
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Vault">
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
