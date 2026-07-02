"use client";

import { useMemo, useState } from "react";
import Button from "@/components/atoms/Button";
import Modal from "@/components/molecules/Modal";
import {
  createDemoAccount,
  createDemoContact,
  importDemoCrmBatch,
} from "@/lib/demo-lifecycle-actions";
import type { CrmAccount, LeadSource, StakeholderRole } from "@/lib/mock-crm";

const SEGMENTS: Array<CrmAccount["segment"]> = [
  "enterprise",
  "mid_market",
  "smb",
];

const SOURCES: LeadSource[] = [
  "manual_rep_entry",
  "website_form",
  "dedicated_text",
  "meeting_transcript",
  "referral",
];

const STAKEHOLDER_ROLES: StakeholderRole[] = [
  "champion",
  "decision_maker",
  "legal",
  "finance",
  "procurement",
  "evaluator",
  "influencer",
];

const inputClasses =
  "w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none";
const labelClasses = "mb-1 block text-xs font-medium text-text-secondary";

export function CreateAccountModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("Atlas Creative Group");
  const [segment, setSegment] = useState<CrmAccount["segment"]>("mid_market");
  const [ownerName, setOwnerName] = useState("Ana Chen");
  const [source, setSource] = useState<LeadSource>("manual_rep_entry");

  const handleCreate = () => {
    createDemoAccount({ name, segment, ownerName, source });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Account" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Demo-only account creation. This seeds a local account memory
          workspace and makes the record available across Vault-linked flows.
        </p>

        <div>
          <label htmlFor="account-name" className={labelClasses}>
            Account Name
          </label>
          <input
            id="account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="account-segment" className={labelClasses}>
              Segment
            </label>
            <select
              id="account-segment"
              value={segment}
              onChange={(event) =>
                setSegment(event.target.value as CrmAccount["segment"])
              }
              className={inputClasses}
            >
              {SEGMENTS.map((value) => (
                <option key={value} value={value}>
                  {value.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="account-owner" className={labelClasses}>
              Owner
            </label>
            <input
              id="account-owner"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <div>
          <label htmlFor="account-source" className={labelClasses}>
            Discovery Source
          </label>
          <select
            id="account-source"
            value={source}
            onChange={(event) => setSource(event.target.value as LeadSource)}
            className={inputClasses}
          >
            {SOURCES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Account</Button>
        </div>
      </div>
    </Modal>
  );
}

export function CreateContactModal({
  account,
  isOpen,
  onClose,
}: {
  account: CrmAccount | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("Morgan Lee");
  const [role, setRole] = useState("Finance Director");
  const [email, setEmail] = useState("morgan.lee@example.com");
  const [phone, setPhone] = useState("(310) 555-0119");
  const [stakeholderRole, setStakeholderRole] =
    useState<StakeholderRole>("finance");

  const title = useMemo(
    () => (account ? `Add Contact — ${account.name}` : "Add Contact"),
    [account],
  );

  if (!account) return null;

  const handleCreate = () => {
    createDemoContact({
      accountId: account.id,
      name,
      role,
      email,
      phone,
      stakeholderRole,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Manual Vault entry should remain first-class. This creates a local
          contact, stakeholder mapping entry, and account memory event.
        </p>

        <div>
          <label htmlFor="contact-name" className={labelClasses}>
            Full Name
          </label>
          <input
            id="contact-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="contact-role" className={labelClasses}>
              Role Title
            </label>
            <input
              id="contact-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="contact-stakeholder-role" className={labelClasses}>
              Stakeholder Role
            </label>
            <select
              id="contact-stakeholder-role"
              value={stakeholderRole}
              onChange={(event) =>
                setStakeholderRole(event.target.value as StakeholderRole)
              }
              className={inputClasses}
            >
              {STAKEHOLDER_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="contact-email" className={labelClasses}>
              Email
            </label>
            <input
              id="contact-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="contact-phone" className={labelClasses}>
              Phone
            </label>
            <input
              id="contact-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Add Contact</Button>
        </div>
      </div>
    </Modal>
  );
}

export function ImportCrmDataModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [accountName, setAccountName] = useState("Beacon Frontier");
  const [contactName, setContactName] = useState("Jamie Ortiz");
  const [contactRole, setContactRole] = useState("Operations Lead");
  const [source, setSource] = useState<LeadSource>("website_form");

  const handleImport = () => {
    importDemoCrmBatch({
      accountName,
      contactName,
      contactRole,
      source,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Vault Data"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Demo import flow for CSV or external Vault payloads. This creates a
          local account, contact, linked artifact, and follow-up review task.
        </p>

        <div>
          <label htmlFor="import-account-name" className={labelClasses}>
            Account Name
          </label>
          <input
            id="import-account-name"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="import-contact-name" className={labelClasses}>
              Primary Contact
            </label>
            <input
              id="import-contact-name"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="import-contact-role" className={labelClasses}>
              Role
            </label>
            <input
              id="import-contact-role"
              value={contactRole}
              onChange={(event) => setContactRole(event.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <div>
          <label htmlFor="import-source" className={labelClasses}>
            Source
          </label>
          <select
            id="import-source"
            value={source}
            onChange={(event) => setSource(event.target.value as LeadSource)}
            className={inputClasses}
          >
            {SOURCES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImport}>Import Payload</Button>
        </div>
      </div>
    </Modal>
  );
}
