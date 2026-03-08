"use client";

import { useMemo, useState } from "react";
import { MOCK_CRM_CONTACTS } from "@/lib/mock-crm-enhancements";

const grouped = MOCK_CRM_CONTACTS.reduce<
  Record<string, typeof MOCK_CRM_CONTACTS>
>((acc, contact) => {
  if (!acc[contact.accountName]) acc[contact.accountName] = [];
  acc[contact.accountName].push(contact);
  return acc;
}, {});

export default function CrmContactsPage() {
  const [selectedContactId, setSelectedContactId] = useState(
    MOCK_CRM_CONTACTS[0]?.id,
  );
  const [detailNote, setDetailNote] = useState(
    "Select a stakeholder to inspect role, source, and next-step context.",
  );
  const selectedContact = useMemo(
    () =>
      MOCK_CRM_CONTACTS.find((contact) => contact.id === selectedContactId) ??
      MOCK_CRM_CONTACTS[0],
    [selectedContactId],
  );
  const peers = useMemo(
    () =>
      MOCK_CRM_CONTACTS.filter(
        (contact) =>
          contact.accountName === selectedContact.accountName &&
          contact.id !== selectedContact.id,
      ),
    [selectedContact],
  );

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Contacts</h1>
          <p className="text-xs text-text-muted">
            Account directory with stakeholder and org context
          </p>
        </div>
        <span className="rounded-full bg-chamber-review/15 px-3 py-1 text-xs font-medium text-chamber-review">
          Accounts
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Directory
          </div>
          <div className="mt-4 space-y-4">
            {Object.entries(grouped).map(([accountName, contacts]) => (
              <div key={accountName}>
                <h2 className="text-sm font-semibold text-text-primary">
                  {accountName}
                </h2>
                <div className="mt-2 space-y-2">
                  {(contacts ?? []).map((contact) => (
                    <button
                      key={contact.id}
                      className={`block w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedContact.id === contact.id
                          ? "border-accent-primary bg-surface-raised"
                          : "border-surface-border bg-surface-overlay hover:bg-surface-raised"
                      }`}
                      onClick={() => setSelectedContactId(contact.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {contact.name}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {contact.role}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-text-muted">
                          <div>{contact.interactions} interactions</div>
                          <div>{contact.lastInteraction}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Org Tree
          </div>
          <div className="mt-4 space-y-5">
            {Object.entries(grouped).map(([accountName, contacts]) => {
              const roots = (contacts ?? []).filter(
                (contact) => !contact.managerName,
              );
              return (
                <div
                  key={`${accountName}_tree`}
                  className="rounded-lg border border-surface-border bg-surface-overlay p-4"
                >
                  <div className="text-sm font-semibold text-text-primary">
                    {accountName}
                  </div>
                  <div className="mt-3 space-y-3">
                    {roots.map((root) => (
                      <div key={root.id}>
                        <TreeNode contact={root} />
                        <div className="ml-6 mt-2 space-y-2 border-l border-surface-border pl-4">
                          {(contacts ?? [])
                            .filter(
                              (contact) => contact.managerName === root.name,
                            )
                            .map((contact) => (
                              <TreeNode
                                key={contact.id}
                                contact={contact}
                                compact
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Selected Stakeholder
          </div>
          <div className="mt-3">
            <div className="text-base font-semibold text-text-primary">
              {selectedContact.name}
            </div>
            <div className="mt-1 text-sm text-text-secondary">
              {selectedContact.role} · {selectedContact.accountName}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <DetailMetric
              label="Source"
              value={selectedContact.source.replace("_", " ")}
            />
            <DetailMetric
              label="Last Interaction"
              value={selectedContact.lastInteraction}
            />
            <DetailMetric
              label="Touches"
              value={`${selectedContact.interactions}`}
            />
            <DetailMetric
              label="Manager"
              value={selectedContact.managerName ?? "Top-level stakeholder"}
            />
          </div>
          <div className="mt-4 rounded-lg border border-surface-border bg-surface-overlay p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Relationship Context
            </div>
            <div className="mt-2 space-y-2 text-sm text-text-secondary">
              {peers.length > 0 ? (
                peers.map((peer) => (
                  <div key={peer.id}>
                    - Works alongside {peer.name} ({peer.role})
                  </div>
                ))
              ) : (
                <div>- No additional mapped stakeholders yet.</div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setDetailNote(
                  `Opened outreach draft for ${selectedContact.name}.`,
                )
              }
            >
              Start Outreach
            </button>
            <button
              className="rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              onClick={() =>
                setDetailNote(
                  `Assigned ${selectedContact.name} to the finance stakeholder cluster.`,
                )
              }
            >
              Map Group
            </button>
          </div>
          <div className="mt-3 text-xs text-text-muted">{detailNote}</div>
        </div>
      </div>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}

function TreeNode({
  contact,
  compact = false,
}: {
  contact: (typeof MOCK_CRM_CONTACTS)[number];
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div
        className={`${compact ? "text-xs" : "text-sm"} font-medium text-text-primary`}
      >
        {contact.name}
      </div>
      <div className="mt-1 text-[11px] text-text-muted">
        {contact.role} · {contact.interactions} msgs
      </div>
    </div>
  );
}
