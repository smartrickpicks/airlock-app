"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/stores/admin.store";

const ACTION_COLORS: Record<string, string> = {
  "feature_flag.toggle": "text-accent-primary",
  "member.role_change": "text-accent-warning",
  "member.invited": "text-accent-success",
  "member.deactivated": "text-accent-error",
  "member.module_role": "text-accent-warning",
  "workspace.setting_change": "text-text-secondary",
};

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? "text-text-muted";
  const dotIndex = action.indexOf(".");
  const domain = action.slice(0, dotIndex);
  const verb = action.slice(dotIndex + 1);
  return (
    <span className={`font-mono text-xs ${color}`}>
      {domain}.<span className="font-semibold">{verb}</span>
    </span>
  );
}

export default function AdminAuditLogPage() {
  const { auditLog, fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">

        <div>
          <h1 className="text-lg font-bold text-text-primary">Audit log</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Immutable record of all admin actions across the workspace. Retained for 90 days.
          </p>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised">
          {auditLog.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted">No audit events yet.</div>
          ) : (
            <div className="divide-y divide-surface-border">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-overlay/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ActionBadge action={entry.action} />
                      <span className="text-xs text-text-muted">by</span>
                      <span className="text-xs font-medium text-text-primary">{entry.actor}</span>
                      <span className="text-xs text-text-muted">→</span>
                      <span className="text-xs text-text-secondary">{entry.target}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">{entry.details}</p>
                  </div>
                  <time className="flex-shrink-0 tabular-nums text-xs text-text-muted">
                    {new Date(entry.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
