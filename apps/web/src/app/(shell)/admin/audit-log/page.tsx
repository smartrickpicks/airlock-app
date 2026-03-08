"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/stores/admin.store";

export default function AdminAuditLogPage() {
  const { auditLog, fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl">
        <h1 className="text-lg font-bold text-text-primary">Audit Log</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Full event stream of admin actions across the workspace.
        </p>
        <div className="mt-4 space-y-2">
          {auditLog.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-surface-border bg-surface-raised p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">{entry.action}</span>
                <span className="text-xs text-text-muted">{entry.timestamp}</span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">{entry.actor}</p>
            </div>
          ))}
          {auditLog.length === 0 && (
            <p className="text-sm text-text-muted">No audit events yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
