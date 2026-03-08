"use client";

import { ROLE_PERMISSIONS } from "@/lib/mock-admin";

const ROLE_COLS = [
  { key: "member", label: "Member" },
  { key: "lead", label: "Lead" },
  { key: "director", label: "Director" },
  { key: "executive", label: "Executive" },
] as const;

const MODULE_ROLES = [
  { role: "builder", label: "Builder", description: "Drafts and assembles vault fields (Discover + Build chambers)." },
  { role: "gatekeeper", label: "Gatekeeper", description: "Reviews and approves patches (Review chamber)." },
  { role: "owner", label: "Owner", description: "Promotes vaults and publishes final output (Ship chamber)." },
  { role: "viewer", label: "Viewer", description: "Read-only access to vault data." },
];

export default function AdminRolesPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl space-y-6">

        <div>
          <h1 className="text-lg font-bold text-text-primary">Roles & permissions</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Org roles control admin access. Module roles control vault actions within each module.
          </p>
        </div>

        {/* Org role matrix */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Org role permissions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    Permission
                  </th>
                  {ROLE_COLS.map((col) => (
                    <th key={col.key} className="px-3 py-2.5 text-center text-xs font-medium text-text-muted">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {ROLE_PERMISSIONS.map((perm) => (
                  <tr key={perm.action} className="hover:bg-surface-overlay/30">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium text-text-primary">{perm.action}</span>
                      <p className="text-xs text-text-muted">{perm.description}</p>
                    </td>
                    {ROLE_COLS.map((col) => (
                      <td key={col.key} className="px-3 py-2.5 text-center">
                        {perm[col.key] ? (
                          <span className="inline-block h-4 w-4 rounded-full bg-accent-success/20 text-accent-success text-[10px] leading-4">✓</span>
                        ) : (
                          <span className="inline-block h-4 w-4 text-text-muted text-[10px] leading-4">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Module roles */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Module roles</h2>
            <p className="mt-0.5 text-xs text-text-muted">Assigned per-member per-module in the Members page.</p>
          </div>
          <div className="divide-y divide-surface-border">
            {MODULE_ROLES.map((r) => (
              <div key={r.role} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 w-20 flex-shrink-0 text-xs font-semibold text-text-primary capitalize">
                  {r.label}
                </span>
                <span className="text-xs text-text-secondary">{r.description}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
