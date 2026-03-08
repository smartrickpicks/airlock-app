"use client";

import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

export default function AdminDataSourcePage() {
  const config = useCapabilityTreeStore((s) => s.nodeConfigs["data_source"] ?? {});
  const state = useCapabilityTreeStore((s) => s.nodeStates["data_source"] ?? "available");

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl">
        <h1 className="text-lg font-bold text-text-primary">Data Source</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Connect a data source to import contracts and records into Airlock.
        </p>
        <div className="mt-4 rounded-lg border border-surface-border bg-surface-raised p-4">
          <pre className="text-xs text-text-muted">
            {JSON.stringify({ state, config }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
