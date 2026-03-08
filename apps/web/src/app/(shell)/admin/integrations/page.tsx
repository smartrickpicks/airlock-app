"use client";

import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

export default function AdminIntegrationsPage() {
  const config = useCapabilityTreeStore(
    (s) => s.nodeConfigs["integrations"] ?? {},
  );
  const state = useCapabilityTreeStore(
    (s) => s.nodeStates["integrations"] ?? "available",
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl">
        <h1 className="text-lg font-bold text-text-primary">Integrations</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Connect OAuth and API key integrations: Google Drive, Salesforce,
          Slack, Jira.
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
