"use client";

import { useEffect, useState } from "react";
import Button from "@/components/atoms/Button";
import Modal from "@/components/molecules/Modal";
import type { ContractTemplate } from "@/lib/mock-clauses";
import {
  advanceDemoSignature,
  createDemoGeneratedContract,
} from "@/lib/demo-lifecycle-actions";
import { MOCK_CRM_ACCOUNTS } from "@/lib/mock-crm";
import {
  getDemoGeneratedContracts,
  mergeDemoAccounts,
} from "@/stores/demo-lifecycle.store";

interface ContractExportModalProps {
  template: ContractTemplate | null;
  preview: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractExportModal({
  template,
  preview,
  isOpen,
  onClose,
}: ContractExportModalProps) {
  const placeholderCount = (preview.match(/\[TO_BE_DEFINED\]/g) ?? []).length;
  const accounts = mergeDemoAccounts(MOCK_CRM_ACCOUNTS);
  const defaultAccountId =
    accounts.find((account) => account.name.includes("Northstar"))?.id ??
    accounts[0]?.id ??
    "";
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [draftTitle, setDraftTitle] = useState(
    `${template?.display_name ?? "Contract"} -- Demo Draft`,
  );
  const [createdContractId, setCreatedContractId] = useState<string | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const createdContract =
    getDemoGeneratedContracts().find(
      (contract) => contract.id === createdContractId,
    ) ?? null;

  useEffect(() => {
    if (!accountId && defaultAccountId) {
      setAccountId(defaultAccountId);
    }
  }, [accountId, defaultAccountId]);

  if (!template) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Draft" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          This local handoff creates a demo contract record and propagates it
          into Vault, Documents, Review Queue, Tasks, Calendar, and account
          memory.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Template" value={template.display_name} />
          <MetricCard label="Sections" value={`${template.sections.length}`} />
          <MetricCard label="Open Placeholders" value={`${placeholderCount}`} />
          <MetricCard label="Export Target" value="Lifecycle packet" />
        </div>

        <div>
          <label
            htmlFor="contract-demo-account"
            className="mb-1 block text-xs font-medium text-text-secondary"
          >
            Target Account
          </label>
          <select
            id="contract-demo-account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="contract-demo-title"
            className="mb-1 block text-xs font-medium text-text-secondary"
          >
            Draft Title
          </label>
          <input
            id="contract-demo-title"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            className="w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          />
        </div>

        {createdContract ? (
          <div className="space-y-3 rounded-lg border border-surface-border bg-surface-overlay p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {createdContract.title}
                </div>
                <div className="text-xs text-text-muted">
                  Signature stub:{" "}
                  {createdContract.signatureState.replace(/_/g, " ")}
                </div>
              </div>
              <span className="rounded-full bg-accent-primary/10 px-2 py-1 text-[10px] font-medium text-accent-primary">
                Local demo
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  advanceDemoSignature(
                    createdContract.id,
                    "ready_for_signature",
                  );
                  setStatusMessage("Signature packet prepared locally.");
                }}
              >
                Prepare Envelope
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  advanceDemoSignature(
                    createdContract.id,
                    "sent_for_signature",
                  );
                  setStatusMessage("Contract moved to sent for signature.");
                }}
              >
                Send for Signature
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  advanceDemoSignature(createdContract.id, "partially_signed");
                  setStatusMessage("Contract marked partially signed.");
                }}
              >
                Mark Partially Signed
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  advanceDemoSignature(createdContract.id, "signed");
                  setStatusMessage(
                    "Contract marked signed and propagated downstream.",
                  );
                }}
              >
                Mark Signed
              </Button>
            </div>
          </div>
        ) : null}

        {statusMessage ? (
          <p className="text-xs text-accent-primary">{statusMessage}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              const created = createDemoGeneratedContract({
                accountId,
                title: draftTitle,
                templateName: template.display_name,
                contractType: template.contract_type,
              });
              if (created) {
                setCreatedContractId(created.id);
                setStatusMessage(
                  "Demo contract created and propagated into downstream module views.",
                );
              }
            }}
          >
            {createdContract ? "Create Another Draft" : "Create Demo Contract"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
