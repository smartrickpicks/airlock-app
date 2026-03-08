"use client";

import { MOCK_AI_PROVIDERS } from "@/lib/mock-admin";

const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-accent-success/15 text-accent-success" },
  fallback: { label: "Fallback", color: "bg-accent-warning/15 text-accent-warning" },
  offline: { label: "Offline", color: "bg-text-muted/15 text-text-muted" },
};

export default function AdminAiProviderPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">

        <div>
          <h1 className="text-lg font-bold text-text-primary">AI Provider</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure the LiteLLM gateway that powers Otto and contract extraction. Requests fall through providers in order.
          </p>
        </div>

        <div className="space-y-3">
          {MOCK_AI_PROVIDERS.map((provider, i) => {
            const status = STATUS_CONFIG[provider.status];
            return (
              <div
                key={provider.id}
                className="rounded-lg border border-surface-border bg-surface-raised"
              >
                <div className="flex items-start justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-muted">#{i + 1}</span>
                      <span className="text-sm font-semibold text-text-primary">{provider.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-text-secondary">{provider.model}</p>
                    <div className="mt-2 flex gap-4 text-xs text-text-muted">
                      <span>{provider.latency}</span>
                      <span>{provider.costPer1k} / 1k tokens</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-surface-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={provider.masked_key}
                      className="flex-1 rounded-md border border-surface-border bg-surface-base px-3 py-1.5 font-mono text-xs text-text-muted"
                    />
                    <button className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-2 text-xs font-semibold text-text-primary">Routing logic</h3>
          <p className="text-xs text-text-secondary">
            Requests route to <strong className="text-text-primary">Claude Sonnet 4.6</strong> by default.
            On 5xx errors or rate limits, traffic falls to GPT-4o, then to Ollama (local) if configured.
            The gateway is managed by LiteLLM running on the API server.
          </p>
        </div>

      </div>
    </div>
  );
}
