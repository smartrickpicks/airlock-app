"use client";

const ROLES = ["Owner", "Gatekeeper", "Builder", "Viewer"] as const;
const CHAMBERS = ["Discover", "Build", "Review", "Ship"] as const;

const PERMISSIONS: Record<string, boolean[]> = {
  Owner: [true, true, true, true],
  Gatekeeper: [true, true, true, false],
  Builder: [true, true, false, false],
  Viewer: [false, false, false, false],
};

export default function PermissionMatrix() {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <h3 className="text-sm font-semibold text-text-primary">
        Chamber Advance Permissions
      </h3>
      <p className="mt-1 text-xs text-text-secondary">
        Vault membership required for all actions. Roles inherit from parent
        vaults.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted" />
              {CHAMBERS.map((ch) => (
                <th
                  key={ch}
                  className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-text-muted"
                >
                  {ch}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border-subtle">
            {ROLES.map((role) => (
              <tr key={role}>
                <td className="px-3 py-2 text-xs font-medium text-text-primary">
                  {role}
                </td>
                {PERMISSIONS[role].map((allowed, i) => (
                  <td key={i} className="px-3 py-2 text-center">
                    {allowed ? (
                      <span className="text-sm text-accent-success">
                        &#10003;
                      </span>
                    ) : (
                      <span className="text-sm text-accent-danger">
                        &#10007;
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
