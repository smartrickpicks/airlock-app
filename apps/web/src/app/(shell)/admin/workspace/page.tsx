"use client";

import { useState } from "react";
import { MOCK_WORKSPACE, INDUSTRY_OPTIONS } from "@/lib/mock-admin";

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-text-muted/15 text-text-muted",
  pro: "bg-accent-primary/15 text-accent-primary",
  enterprise: "bg-accent-success/15 text-accent-success",
};

export default function AdminWorkspacePage() {
  const [name, setName] = useState(MOCK_WORKSPACE.name);
  const [industry, setIndustry] = useState(MOCK_WORKSPACE.industry);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(MOCK_WORKSPACE.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Workspace</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your workspace settings, invite link, and account details.
          </p>
        </div>

        {/* General */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">General</h2>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Workspace name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-text-muted font-mono">
                {MOCK_WORKSPACE.id}
              </span>
              <button
                onClick={handleSave}
                className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                {saved ? "Saved ✓" : "Save changes"}
              </button>
            </div>
          </div>
        </section>

        {/* Plan & usage */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Plan & usage
            </h2>
          </div>
          <div className="divide-y divide-surface-border">
            {(
              [
                [
                  "Plan",
                  <span
                    key="plan"
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PLAN_BADGE[MOCK_WORKSPACE.plan]}`}
                  >
                    {MOCK_WORKSPACE.plan}
                  </span>,
                ],
                [
                  "Members",
                  <span key="members" className="text-sm text-text-primary">
                    {MOCK_WORKSPACE.memberCount}
                  </span>,
                ],
                [
                  "Vaults",
                  <span key="vaults" className="text-sm text-text-primary">
                    {MOCK_WORKSPACE.vaultCount}
                  </span>,
                ],
                [
                  "Created",
                  <span key="created" className="text-sm text-text-secondary">
                    {new Date(MOCK_WORKSPACE.createdAt).toLocaleDateString()}
                  </span>,
                ],
              ] as [string, React.ReactNode][]
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm text-text-secondary">{label}</span>
                {value}
              </div>
            ))}
          </div>
        </section>

        {/* Invite link */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Invite link
            </h2>
          </div>
          <div className="p-4">
            <p className="mb-3 text-xs text-text-secondary">
              Share this link to invite new members. Rotate it if compromised.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={MOCK_WORKSPACE.inviteUrl}
                className="flex-1 rounded-md border border-surface-border bg-surface-base px-3 py-2 font-mono text-xs text-text-muted"
              />
              <button
                onClick={handleCopy}
                className="rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-raised"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-lg border border-accent-error/30 bg-surface-raised">
          <div className="border-b border-accent-error/20 px-4 py-3">
            <h2 className="text-sm font-semibold text-accent-error">
              Danger zone
            </h2>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Archive workspace
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Freezes all vaults. Members lose access. Irreversible without
                support.
              </p>
            </div>
            <button className="rounded-md border border-accent-error/40 px-3 py-1.5 text-xs font-medium text-accent-error hover:bg-accent-error/10">
              Archive
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
