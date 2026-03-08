"use client";

import { MOCK_DATA_SOURCES } from "@/lib/mock-admin";

const STATUS_CONFIG = {
  connected: {
    label: "Connected",
    color: "bg-accent-success/15 text-accent-success",
    dot: "bg-accent-success",
  },
  pending: {
    label: "Pending",
    color: "bg-accent-warning/15 text-accent-warning",
    dot: "bg-accent-warning",
  },
  error: {
    label: "Error",
    color: "bg-accent-error/15 text-accent-error",
    dot: "bg-accent-error",
  },
  not_configured: {
    label: "Not configured",
    color: "bg-text-muted/15 text-text-muted",
    dot: "bg-text-muted",
  },
};

export default function AdminDataSourcePage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Data sources</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage database connections and external data imports. Internal
            sources are managed automatically.
          </p>
        </div>

        <div className="divide-y divide-surface-border rounded-lg border border-surface-border bg-surface-raised">
          {MOCK_DATA_SOURCES.map((source) => {
            const status = STATUS_CONFIG[source.status];
            return (
              <div
                key={source.id}
                className="flex items-start justify-between p-4"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-1.5 w-1.5 rounded-full" style={{}}>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                      />
                    </span>
                    <span className="text-sm font-medium text-text-primary">
                      {source.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {source.description}
                  </p>
                  {source.lastSync && (
                    <p className="mt-1 text-xs text-text-muted">
                      Last sync: {new Date(source.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
                {source.status === "not_configured" ? (
                  <button className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-overlay">
                    Connect
                  </button>
                ) : (
                  <button className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-overlay">
                    Configure
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
