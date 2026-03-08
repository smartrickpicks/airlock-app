"use client";

import { useState } from "react";
import { useAdminStore } from "@/stores/admin.store";
import {
  MEMBER_STATUS_CONFIG,
  ORG_ROLE_LABELS,
  type WorkspaceMember,
} from "@/lib/mock-admin";

function relativeTime(iso: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function moduleRoleSummary(roles: Record<string, string>): string {
  const entries = Object.entries(roles);
  if (entries.length === 0) return "No roles";
  if (entries.length <= 2) {
    return entries.map(([m, r]) => `${m}: ${r}`).join(", ");
  }
  return `${entries.length} modules`;
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  owner: "bg-accent-success/15 text-accent-success",
  gatekeeper: "bg-chamber-review/15 text-chamber-review",
  builder: "bg-chamber-build/15 text-chamber-build",
  designer: "bg-accent-primary/15 text-accent-primary",
  viewer: "bg-text-muted/15 text-text-muted",
};

const CHAMBER_BADGE_COLORS: Record<string, string> = {
  discover: "bg-chamber-discover/15 text-chamber-discover",
  build: "bg-chamber-build/15 text-chamber-build",
  review: "bg-chamber-review/15 text-chamber-review",
  ship: "bg-chamber-ship/15 text-chamber-ship",
};

const ORG_ROLE_OPTIONS: WorkspaceMember["orgRole"][] = [
  "member",
  "lead",
  "director",
  "executive",
];

/* ─── Invite Modal ─────────────────────────────────────────────────── */

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceMember["orgRole"]>("member");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!email.trim()) return;
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-surface-border bg-surface-raised p-6 shadow-xl">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-success/20 text-accent-success">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              Invitation sent
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              {email} will receive an invite to join this workspace as{" "}
              {ORG_ROLE_LABELS[role]}.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded bg-accent-primary px-4 py-1.5 text-xs font-medium text-text-inverse transition-colors hover:bg-accent-primary/80"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-text-primary">
              Invite member
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              Send a workspace invitation by email.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Org role
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as WorkspaceMember["orgRole"])
                  }
                  className="w-full rounded border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  {ORG_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ORG_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded border border-surface-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!email.trim()}
                className="rounded bg-accent-primary px-3 py-1.5 text-xs font-medium text-text-inverse transition-colors hover:bg-accent-primary/80 disabled:opacity-40"
              >
                Send invite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Members Table ────────────────────────────────────────────────── */

export default function MembersTable() {
  const { members, updateMemberRole } = useAdminStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Members</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Manage workspace members and their roles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-surface-overlay px-3 py-1 text-xs font-medium text-text-secondary">
            {members.filter((m) => m.status === "active").length} active
          </span>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-text-inverse transition-colors hover:bg-accent-primary/80"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Invite
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full">
          <thead className="bg-surface-overlay">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Member
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Role
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Module Roles
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Status
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {members.map((member) => {
              const statusCfg = MEMBER_STATUS_CONFIG[member.status];
              const isExpanded = expandedId === member.id;
              return (
                <tr key={member.id} className="group">
                  <td
                    className="cursor-pointer px-2 py-3 transition-colors hover:bg-surface-overlay/50"
                    onClick={() => setExpandedId(isExpanded ? null : member.id)}
                  >
                    <svg
                      className={`h-4 w-4 text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/20 text-xs font-bold text-accent-primary">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {member.name}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={member.orgRole}
                      onChange={(e) =>
                        updateMemberRole(
                          member.id,
                          e.target.value as WorkspaceMember["orgRole"],
                        )
                      }
                      disabled={member.status !== "active"}
                      className="rounded border border-surface-border bg-surface-overlay px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none disabled:opacity-50"
                    >
                      {Object.entries(ORG_ROLE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {moduleRoleSummary(member.moduleRoles)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {relativeTime(member.lastActiveAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Expanded detail section — rendered outside the table for proper layout */}
        {expandedId &&
          (() => {
            const member = members.find((m) => m.id === expandedId);
            if (!member) return null;
            const moduleEntries = Object.entries(member.moduleRoles);
            const vaults = member.vaultMemberships ?? [];

            return (
              <div className="border-t border-surface-border bg-surface-sunken px-6 py-4">
                {/* Module Roles */}
                <div className="mb-4">
                  <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    Module Roles
                  </h4>
                  {moduleEntries.length === 0 ? (
                    <span className="text-xs text-text-muted">
                      No module roles assigned
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {moduleEntries.map(([mod, role]) => (
                        <span
                          key={mod}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_COLORS[role] ?? ROLE_BADGE_COLORS.viewer}`}
                        >
                          {mod}: {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vault Assignments */}
                <div>
                  <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    Vault Assignments
                  </h4>
                  {vaults.length === 0 ? (
                    <span className="text-xs text-text-muted">
                      No vault assignments
                    </span>
                  ) : (
                    <div className="overflow-x-auto rounded border border-surface-border">
                      <table className="w-full">
                        <thead className="bg-surface-overlay">
                          <tr>
                            <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                              Vault Name
                            </th>
                            <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                              Chamber
                            </th>
                            <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                              Role
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border-subtle">
                          {vaults.map((v) => (
                            <tr key={v.vaultId}>
                              <td className="px-3 py-1.5 text-xs text-text-primary">
                                {v.vaultName}
                              </td>
                              <td className="px-3 py-1.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CHAMBER_BADGE_COLORS[v.chamber] ?? ""}`}
                                >
                                  {v.chamber}
                                </span>
                              </td>
                              <td className="px-3 py-1.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ROLE_BADGE_COLORS[v.role] ?? ROLE_BADGE_COLORS.viewer}`}
                                >
                                  {v.role}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
