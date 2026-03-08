"use client";

import {
  ROLE_PERMISSIONS,
  CHAMBER_ACCESS,
  MODULE_ROLE_LABELS,
} from "@/lib/mock-admin";
import type { OrgRole, ModuleRole } from "@/lib/mock-admin";

// Org role columns in hierarchy order
const ORG_COLS: { key: OrgRole; label: string }[] = [
  { key: "architect", label: "Architect" },
  { key: "executive", label: "Executive" },
  { key: "director", label: "Director" },
  { key: "lead", label: "Lead" },
  { key: "member", label: "Member" },
];

const CHAMBERS = [
  { key: "discover", label: "Discover" },
  { key: "build", label: "Build" },
  { key: "review", label: "Review" },
  { key: "ship", label: "Ship" },
];

const MODULE_ROLE_DESCRIPTIONS: { role: ModuleRole; description: string }[] = [
  {
    role: "owner",
    description:
      "Promotes vaults and publishes final output. Full chamber access (Discover → Ship). Makes final decisions.",
  },
  {
    role: "gatekeeper",
    description:
      "Reviews and approves patches. Access up to Review chamber. Cannot ship — that requires Owner.",
  },
  {
    role: "builder",
    description:
      "Drafts and assembles vault fields. Access to Discover + Build chambers. Cannot approve their own patches.",
  },
  {
    role: "designer",
    description:
      "Builds schemas, configures extraction rules, operates in sandbox. Access to Discover + Build chambers.",
  },
  {
    role: "viewer",
    description:
      "Read-only access. Can see vault data and events but cannot take any action or advance through chambers.",
  },
];

function CheckIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-success/15 text-accent-success text-[11px]">
      ✓
    </span>
  );
}

function DashIcon() {
  return <span className="text-xs text-text-muted">—</span>;
}

export default function AdminRolesPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-lg font-bold text-text-primary">
            Roles & permissions
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Airlock uses a two-layer role model.{" "}
            <strong className="text-text-primary">Org roles</strong> control
            workspace admin access.{" "}
            <strong className="text-text-primary">Module roles</strong> control
            chamber visibility and actions within each module.
          </p>
        </div>

        {/* ── Layer 1: Org role permissions matrix ─────────────────────── */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Layer 1 — Org role permissions
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Workspace-level identity. Controls which admin capabilities you
              have. Architect is the founder and cannot be assigned by invite.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    Capability
                  </th>
                  {ORG_COLS.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-2.5 text-center text-xs font-medium ${
                        col.key === "architect"
                          ? "text-accent-primary"
                          : "text-text-muted"
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {ROLE_PERMISSIONS.map((perm) => (
                  <tr key={perm.action} className="hover:bg-surface-overlay/30">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium text-text-primary">
                        {perm.action}
                      </span>
                      <p className="text-[10px] text-text-muted">
                        {perm.description}
                      </p>
                    </td>
                    {ORG_COLS.map((col) => (
                      <td key={col.key} className="px-3 py-2.5 text-center">
                        {perm[col.key] ? <CheckIcon /> : <DashIcon />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Layer 2: Module role descriptions ────────────────────────── */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Layer 2 — Module roles
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Assigned per-member per-module in the Members page. A person can
              have different module roles in different modules.
            </p>
          </div>
          <div className="divide-y divide-surface-border">
            {MODULE_ROLE_DESCRIPTIONS.map((r) => (
              <div key={r.role} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 w-24 flex-shrink-0 text-xs font-semibold text-text-primary capitalize">
                  {MODULE_ROLE_LABELS[r.role]}
                </span>
                <span className="text-xs text-text-secondary">
                  {r.description}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Chamber access matrix ─────────────────────────────────────── */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Chamber access by module role
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Applies to modules that have a lifecycle (Contracts, CRM). Roles
              inherit from parent vaults.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    Module Role
                  </th>
                  {CHAMBERS.map((ch) => (
                    <th
                      key={ch.key}
                      className="px-3 py-2.5 text-center text-xs font-medium text-text-muted"
                    >
                      {ch.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {(Object.keys(CHAMBER_ACCESS) as ModuleRole[]).map((role) => (
                  <tr key={role} className="hover:bg-surface-overlay/30">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium text-text-primary capitalize">
                        {MODULE_ROLE_LABELS[role]}
                      </span>
                    </td>
                    {CHAMBERS.map((ch) => (
                      <td key={ch.key} className="px-3 py-2.5 text-center">
                        {CHAMBER_ACCESS[role][ch.key] ? (
                          <CheckIcon />
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-danger/10 text-accent-danger text-[11px]">
                            ✕
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-surface-border px-4 py-2.5">
            <p className="text-[10px] text-text-muted">
              <strong className="text-text-secondary">Viewer</strong> has no
              active chamber access — read-only across all stages. Assign module
              roles per-member per-module on the Members page.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
