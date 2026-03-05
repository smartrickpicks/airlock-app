"use client";

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

export default function MembersTable() {
  const { members, updateMemberRole } = useAdminStore();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Members</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Manage workspace members and their roles
          </p>
        </div>
        <span className="rounded-full bg-surface-overlay px-3 py-1 text-xs font-medium text-text-secondary">
          {members.filter((m) => m.status === "active").length} active
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full">
          <thead className="bg-surface-overlay">
            <tr>
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
              return (
                <tr
                  key={member.id}
                  className="transition-colors hover:bg-surface-overlay/50"
                >
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
      </div>
    </div>
  );
}
