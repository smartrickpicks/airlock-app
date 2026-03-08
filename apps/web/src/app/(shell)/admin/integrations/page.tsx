"use client";

import { useState } from "react";
import { MOCK_INTEGRATIONS, type Integration } from "@/lib/mock-admin";

const CATEGORY_LABELS: Record<Integration["category"], string> = {
  communication: "Communication",
  video: "Video",
  automation: "Automation",
  notifications: "Notifications",
};

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(MOCK_INTEGRATIONS);

  function toggle(id: string) {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: i.status === "connected" ? "not_connected" as const : "connected" as const }
          : i
      )
    );
  }

  const byCategory = integrations.reduce<Record<string, Integration[]>>((acc, i) => {
    const cat = CATEGORY_LABELS[i.category];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(i);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">

        <div>
          <h1 className="text-lg font-bold text-text-primary">Integrations</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Connect third-party services to extend Airlock with notifications, video, and automation.
          </p>
        </div>

        {Object.entries(byCategory).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {category}
            </h2>
            <div className="divide-y divide-surface-border rounded-lg border border-surface-border bg-surface-raised">
              {items.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-4">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {integration.label}
                      </span>
                      {integration.status === "connected" && (
                        <span className="rounded-full bg-accent-success/15 px-2 py-0.5 text-xs font-medium text-accent-success">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary">{integration.description}</p>
                  </div>
                  <button
                    onClick={() => toggle(integration.id)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      integration.status === "connected"
                        ? "border-surface-border text-text-muted hover:bg-surface-overlay"
                        : "border-accent-primary/40 text-accent-primary hover:bg-accent-primary/10"
                    }`}
                  >
                    {integration.status === "connected" ? "Disconnect" : "Connect"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}

      </div>
    </div>
  );
}
