"use client";

import { useState } from "react";
import Button from "@/components/atoms/Button";
import Modal from "@/components/molecules/Modal";
import { createDemoInboundContractIntake } from "@/lib/demo-lifecycle-actions";
import { MOCK_CRM_ACCOUNTS } from "@/lib/mock-crm";
import {
  mergeDemoAccounts,
  type DemoGeneratedContract,
} from "@/stores/demo-lifecycle.store";

interface InboundContractIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (contract: DemoGeneratedContract) => void;
}

const inputClasses =
  "w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none";
const labelClasses = "mb-1 block text-xs font-medium text-text-secondary";

export default function InboundContractIntakeModal({
  isOpen,
  onClose,
  onCreated,
}: InboundContractIntakeModalProps) {
  const accounts = mergeDemoAccounts(MOCK_CRM_ACCOUNTS);
  const [accountMode, setAccountMode] = useState<"existing" | "new">(
    "existing",
  );
  const [existingAccountId, setExistingAccountId] = useState(
    accounts[0]?.id ?? "",
  );
  const [accountName, setAccountName] = useState("Atlas Creative Group");
  const [ownerName, setOwnerName] = useState("Ana Chen");
  const [contactName, setContactName] = useState("Leah Morgan");
  const [contractTitle, setContractTitle] = useState(
    "Atlas Services Agreement",
  );
  const [contractType, setContractType] = useState("Services Agreement");
  const [fileName, setFileName] = useState("atlas-services-agreement.pdf");
  const [source, setSource] = useState<
    "Local Upload" | "Google Drive Import" | "Email Intake"
  >("Local Upload");

  const handleCreate = () => {
    const created = createDemoInboundContractIntake({
      existingAccountId: accountMode === "existing" ? existingAccountId : null,
      accountName:
        accountMode === "existing"
          ? (accounts.find((account) => account.id === existingAccountId)
              ?.name ?? accountName)
          : accountName,
      ownerName,
      contractTitle,
      contractType,
      fileName,
      source,
      contactName,
    });
    onCreated?.(created);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Contract" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          This is the canonical inbound-contract demo path. One intake action
          creates the contract artifact, vault, triage task, account memory
          event, and downstream lifecycle record.
        </p>

        <div>
          <label className={labelClasses}>Account Handling</label>
          <div className="flex gap-2">
            <button
              onClick={() => setAccountMode("existing")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                accountMode === "existing"
                  ? "bg-accent-primary/15 text-accent-primary"
                  : "bg-surface-overlay text-text-secondary"
              }`}
            >
              Link Existing
            </button>
            <button
              onClick={() => setAccountMode("new")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                accountMode === "new"
                  ? "bg-accent-primary/15 text-accent-primary"
                  : "bg-surface-overlay text-text-secondary"
              }`}
            >
              Create New
            </button>
          </div>
        </div>

        {accountMode === "existing" ? (
          <div>
            <label htmlFor="existing-account" className={labelClasses}>
              Existing Account
            </label>
            <select
              id="existing-account"
              value={existingAccountId}
              onChange={(event) => setExistingAccountId(event.target.value)}
              className={inputClasses}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="new-account-name" className={labelClasses}>
              New Account Name
            </label>
            <input
              id="new-account-name"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className={inputClasses}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="owner-name" className={labelClasses}>
              Owner
            </label>
            <input
              id="owner-name"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="contact-name" className={labelClasses}>
              Primary Contact
            </label>
            <input
              id="contact-name"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contract-title" className={labelClasses}>
            Contract Title
          </label>
          <input
            id="contract-title"
            value={contractTitle}
            onChange={(event) => setContractTitle(event.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="contract-type" className={labelClasses}>
              Contract Type
            </label>
            <input
              id="contract-type"
              value={contractType}
              onChange={(event) => setContractType(event.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="file-name" className={labelClasses}>
              File Name
            </label>
            <input
              id="file-name"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contract-source" className={labelClasses}>
            Intake Source
          </label>
          <select
            id="contract-source"
            value={source}
            onChange={(event) =>
              setSource(
                event.target.value as
                  | "Local Upload"
                  | "Google Drive Import"
                  | "Email Intake",
              )
            }
            className={inputClasses}
          >
            <option value="Local Upload">Local Upload</option>
            <option value="Google Drive Import">Google Drive Import</option>
            <option value="Email Intake">Email Intake</option>
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Intake</Button>
        </div>
      </div>
    </Modal>
  );
}
