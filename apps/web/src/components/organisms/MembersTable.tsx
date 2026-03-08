"use client";

import { useState } from "react";
import { useAdminStore } from "@/stores/admin.store";
import {
  MEMBER_STATUS_CONFIG,
  ORG_ROLE_LABELS,
  MODULE_ROLE_LABELS,
  CHAMBER_ACCESS,
  MOCK_MODULE_CONFIGS,
  type WorkspaceMember,
  type OrgRole,
  type ModuleRole,
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

const CHAMBERS = [
  { key: "discover", label: "Discover", color: "text-chamber-discover" },
  { key: "build",    label: "Build",    color: "text-chamber-build"    },
  { key: "review",   label: "Review",   color: "text-chamber-review"   },
  { key: "ship",     label: "Ship",     color: "text-chamber-ship"     },
] as const;

const ORG_ROLE_BADGE: Record<OrgRole, string> = {
  architect: "bg-accent-primary/20 text-accent-primary",
  executive: "bg-accent-success/20 text-accent-success",
  director:  "bg-accent-warning/20 text-accent-warning",
  lead:      "bg-text-secondary/20 text-text-secondary",
  member:    "bg-surface-overlay text-text-muted",
};

// ─── Expanded module-role editor ──────────────────────────────────────

function ModuleRoleEditor({ member }: { member: WorkspaceMember }) {
  const { updateMemberModuleRole } = useAdminStore();
  const isActive = member.status === "active";

  return (
    <div className="border-t border-surface-border bg-surface-sunken px-4 py-3">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Module Permissions
      </p>
      <div className="space-y-2">
        {MOCK_MODULE_CONFIGS.map((mod) => {
          const moduleRole = (member.moduleRoles[mod.id] as ModuleRole) ?? "viewer";
          const access = CHAMBER_ACCESS[moduleRole];
          const hasChambers = mod.chambers.length > 0;

          return (
            <div
              key={mod.id}
              className="flex items-center gap-3 rounded-md border border-surface-border bg-surface-raised px-3 py-2"
            >
              {/* Module name */}
              <span className="w-24 flex-shrink-0 text-xs font-medium text-text-primary">
                {mod.label}
              </span>

              {/* Role selector */}
              <select
                value={moduleRole}
                onChange={(e) =>
                  updateMemberModuleRole(
                    member.id,
                    mod.id,
                    e.target.value as ModuleRole,
                  )
                }
                disabled={!isActive}
                className="rounded border border-surface-border bg-surface-overlay px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none disabled:opacity-40"
              >
                {Object.entries(MODULE_ROLE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Chamber access indicators (only for modules with chambers) */}
              {hasChambers && (
                <div className="flex items-center gap-2 ml-1">
                  {CHAMBERS.map((ch) => {
                    if (!mod.chambers.map((c) => c.toLowerCase()).includes(ch.key)) return null;
                    const allowed = access[ch.key];
                    return (
                      <span
                        key={ch.key}
                        title={`${ch.label}: ${allowed ? "accessible" : "no access"}`}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          allowed
                            ? `${ch.color} bg-current/10 opacity-100`
                            : "bg-surface-border text-text-muted opacity-50"
                        }`}
                        style={allowed ? { backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)" } : {}}
                      >
                        {ch.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-text-muted">
        Chamber badges show which stages this member can access in modules that have a lifecycle.
        Viewer has no chamber access. Builder sees Discover + Build. Gatekeeper adds Review. Owner has all four.
      </p>
    </div>
  );
}

// ─── Invite modal (stateful placeholder) ─────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [orgRole, setOrgRole] = useState<OrgRole>("member");
  const [sent, setSent] = useState(false);

  const handleInvite = () => {
    if (!email.trim()) return;
    setSent(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-base p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-text-primary">Invite a member</h3>
        <p className="mt-1 text-xs text-text-secondary">
          They&apos;ll receive an email with a magic link to join your workspace.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Org role
            </label>
            <select
              value={orgRole}
              onChange={(e) => setOrgRole(e.target.value as OrgRole)}
              className="w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              {(["member", "lead", "director", "executive"] as OrgRole[]).map((r) => (
                <option key={r} value={r}>
                  {ORG_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-text-muted">
              Architect is reserved for the workspace founder and cannot be invited.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={!email.trim() || sent}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {sent ? "Invitation sent!" : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────

export default function MembersTable() {
  const { members, updateMemberRole } = useAdminStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Members</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Manage workspace members and their roles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-surface-overlay px-3 py-1 text-xs font-medium text-text-secondary">
            {activeCount} active
          </span>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <span className="text-base leading-none">+</span>
            Invite
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full">
          <thead className="bg-surface-overlay">
            <tr>
              <th className="w-6 px-3 py-2" />
              <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Member
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Org Role
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
          <tbody>
            {members.map((member) => {
              const statusCfg = MEMBER_STATUS_CONFIG[member.status];
              const isExpanded = expandedId === member.id;
              const moduleRoleEntries = Object.entries(member.moduleRoles);

              return (
                <>
                  <tr
                    key={member.id}
                    className="border-t border-surface-border transition-colors hover:bg-surface-overlay/50 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : member.id)
                    }
                  >
                    {/* Chevron */}
                    <td className="pl-3 pr-1 py-3">
                      <svg
                        className={`h-3.5 w-3.5 text-text-muted transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </td>

                    {/* Member */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-primary/20 text-xs font-bold text-accent-primary">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {member.name}
                          </p>
                          <p className="text-[10px] text-text-muted">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Org Role */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={member.orgRole}
                        onChange={(e) =>
                          updateMemberRole(
                            member.id,
                            e.target.value as OrgRole,
                          )
                        }
                        disabled={member.status !== "active"}
                        className="rounded border border-surface-border bg-surface-overlay px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none disabled:opacity-50"
                      >
                        {(Object.keys(ORG_ROLE_LABELS) as OrgRole[]).map((val) => (
                          <option key={val} value={val}>
                            {ORG_ROLE_LABELS[val]}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Module Roles summary */}
                    <td className="px-4 py-3">
                      {moduleRoleEntries.length === 0 ? (
                        <span className="text-xs text-text-muted">No roles</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {moduleRoleEntries.slice(0, 3).map(([mod, role]) => (
                            <span
                              key={mod}
                              className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-secondary capitalize"
                            >
                              {mod}: {role}
                            </span>
                          ))}
                          {moduleRoleEntries.length > 3 && (
                            <span className="text-[10px] text-text-muted">
                              +{moduleRoleEntries.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {relativeTime(member.lastActiveAt)}
                    </td>
                  </tr>

                  {/* Expanded module role editor */}
                  {isExpanded && (
                    <tr key={`${member.id}-expanded`}>
                      <td colSpan={6} className="p-0">
                        <ModuleRoleEditor member={member} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
