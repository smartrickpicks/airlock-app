"use client";

import { useState } from "react";
import {
  MOCK_AI_PROVIDERS,
  MOCK_MCP_SERVERS,
  MOCK_INTEGRATIONS,
  PROVIDER_STATUS_CONFIG,
  MCP_STATUS_CONFIG,
  INTEGRATION_STATUS_CONFIG,
  type AiProvider,
  type McpServer,
  type Integration,
} from "@/lib/mock-connectors";
import EmptyState from "@/components/atoms/EmptyState";

type SubTab = "providers" | "mcp" | "integrations";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "providers", label: "AI Providers" },
  { key: "mcp", label: "MCP Servers" },
  { key: "integrations", label: "Integrations" },
];

export default function ConnectorsView() {
  const [activeTab, setActiveTab] = useState<SubTab>("providers");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const selectedServer = selectedServerId
    ? (MOCK_MCP_SERVERS.find((s) => s.id === selectedServerId) ?? null)
    : null;

  if (selectedServer) {
    return (
      <McpServerDetail
        server={selectedServer}
        onBack={() => setSelectedServerId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Connectors</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Manage AI providers, MCP tool servers, and third-party integrations.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border border-surface-border bg-surface-overlay text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "providers" && (
        <AiProvidersSection providers={MOCK_AI_PROVIDERS} />
      )}
      {activeTab === "mcp" && (
        <McpServersSection
          servers={MOCK_MCP_SERVERS}
          onManage={setSelectedServerId}
        />
      )}
      {activeTab === "integrations" && (
        <IntegrationsSection integrations={MOCK_INTEGRATIONS} />
      )}
    </div>
  );
}

// ─── AI Providers ────────────────────────────────────────────────────

function AiProvidersSection({ providers }: { providers: AiProvider[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Configure which LLM Otto uses for this workspace.
        </p>
        <button className="rounded-md border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary">
          + Add Provider
        </button>
      </div>
      {providers.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}

function ProviderCard({ provider }: { provider: AiProvider }) {
  const cfg = PROVIDER_STATUS_CONFIG[provider.status];
  const lastReq = provider.lastRequestAt
    ? formatTimeAgo(provider.lastRequestAt)
    : "Never";

  return (
    <div
      className={`group flex items-center justify-between rounded-lg border border-surface-border bg-surface-raised p-4 transition-colors hover:bg-surface-overlay ${
        provider.status === "active"
          ? "border-l-[3px] border-l-accent-primary"
          : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-block h-2 w-2 rounded-full ${cfg.dotColor} ${
            provider.status === "active"
              ? "shadow-[0_0_6px] shadow-accent-success"
              : ""
          }`}
          aria-label={`${cfg.label} status`}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {provider.name}
            </span>
            {provider.isDefault && (
              <span className="rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-accent-primary/10 text-accent-primary">
                Default
              </span>
            )}
            {provider.status === "disabled" && (
              <span className="rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-text-muted/15 text-text-muted">
                Disabled
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {provider.model} &middot; {provider.roleAccess}
          </p>
          {provider.status === "active" && (
            <p className="mt-0.5 text-[11px] text-text-muted">
              Last request: {lastReq} &middot; ${provider.costToday.toFixed(2)}{" "}
              today
            </p>
          )}
        </div>
      </div>
      <button className="rounded-md border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent-primary/40 hover:text-text-primary">
        Edit
      </button>
    </div>
  );
}

// ─── MCP Servers ─────────────────────────────────────────────────────

function McpServersSection({
  servers,
  onManage,
}: {
  servers: McpServer[];
  onManage: (id: string) => void;
}) {
  if (servers.length === 0) {
    return (
      <EmptyState
        message="No MCP servers connected. Add your first server to give Otto access to external data and tools."
        icon={
          <svg
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
            />
          </svg>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Connect external tool servers. Otto gains their tools based on each
          user&apos;s role.
        </p>
        <button className="rounded-md border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary">
          + Add MCP Server
        </button>
      </div>
      {servers.map((server) => (
        <McpServerCard
          key={server.id}
          server={server}
          onManage={() => onManage(server.id)}
        />
      ))}
    </div>
  );
}

function McpServerCard({
  server,
  onManage,
}: {
  server: McpServer;
  onManage: () => void;
}) {
  const cfg = MCP_STATUS_CONFIG[server.status];

  return (
    <div
      className={`group rounded-lg border border-surface-border bg-surface-raised p-4 transition-colors hover:bg-surface-overlay ${
        server.status === "error" ? "border-l-[3px] border-l-accent-danger" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2 w-2 rounded-full ${cfg.dotColor} ${
              server.status === "active"
                ? "shadow-[0_0_6px] shadow-accent-success"
                : ""
            }`}
            aria-label={`${cfg.label} status`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {server.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cfg.color}`}
              >
                {cfg.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              {server.host} &middot; {server.toolCount} tools &middot;{" "}
              {server.roleAccess}
            </p>
          </div>
        </div>
        <button
          onClick={onManage}
          className="rounded-md border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent-primary/40 hover:text-text-primary"
        >
          Manage &rarr;
        </button>
      </div>

      {/* Credit bar */}
      {server.creditsUsed != null && server.creditsTotal != null && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[11px] text-text-muted">
            Credits: {server.creditsUsed.toLocaleString()} /{" "}
            {server.creditsTotal.toLocaleString()} this month
          </span>
          <CreditBar used={server.creditsUsed} total={server.creditsTotal} />
        </div>
      )}

      {/* Error message */}
      {server.statusMessage && (
        <p className="mt-2 text-xs text-accent-danger">
          {server.statusMessage} &middot; Last synced:{" "}
          {formatTimeAgo(server.lastSyncedAt)}
        </p>
      )}
    </div>
  );
}

function CreditBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min((used / total) * 100, 100);
  const barColor =
    pct >= 95
      ? "bg-accent-danger animate-pulse"
      : pct >= 80
        ? "bg-accent-warning"
        : "bg-accent-success";

  return (
    <div
      className="h-1.5 w-28 rounded-full bg-surface-sunken"
      role="progressbar"
      aria-valuenow={used}
      aria-valuemax={total}
    >
      <div
        className={`h-1.5 rounded-full ${barColor} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── MCP Server Detail ──────────────────────────────────────────────

function McpServerDetail({
  server,
  onBack,
}: {
  server: McpServer;
  onBack: () => void;
}) {
  const cfg = MCP_STATUS_CONFIG[server.status];
  const roles = ["builder", "gatekeeper", "owner"];

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        &larr; Back to MCP Servers
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {server.name}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {server.host} &middot; {server.authType}
            {server.creditsUsed != null && server.creditsTotal != null && (
              <>
                {" "}
                &middot; {server.creditsUsed.toLocaleString()}/
                {server.creditsTotal.toLocaleString()} credits this month
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.color}`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dotColor}`}
            />
            {cfg.label}
          </span>
          <button className="rounded-md border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary">
            Sync
          </button>
          <button className="rounded-md border border-accent-danger/30 bg-accent-danger/10 px-3 py-1.5 text-xs text-accent-danger transition-colors hover:bg-accent-danger/20">
            Disconnect
          </button>
        </div>
      </div>

      {/* Permission Matrix */}
      {server.tools.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Tool Permissions
          </h3>
          <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface-raised">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-surface-border">
                  <th className="sticky left-0 bg-surface-raised px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-text-muted">
                    Tool
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role}
                      className="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-wider text-text-muted"
                    >
                      {role}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-text-muted">
                    Modules
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {server.tools.map((tool) => (
                  <tr
                    key={tool.name}
                    className="transition-colors hover:bg-surface-overlay"
                  >
                    <td className="sticky left-0 bg-surface-raised px-4 py-3 font-mono text-xs text-text-primary group-hover:bg-surface-overlay">
                      {tool.name}
                    </td>
                    {roles.map((role) => (
                      <td key={role} className="px-4 py-3 text-center">
                        {tool.roles[role] ? (
                          <span className="inline-flex h-8 w-16 items-center justify-center rounded bg-accent-success/10">
                            <svg
                              className="h-4 w-4 text-accent-success"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex h-8 w-16 items-center justify-center rounded bg-surface-sunken">
                            <svg
                              className="h-4 w-4 text-text-muted"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20 12H4"
                              />
                            </svg>
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {tool.modules.map((mod) => (
                          <span
                            key={mod}
                            className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400"
                          >
                            {mod.toUpperCase().slice(0, 3)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Integrations ────────────────────────────────────────────────────

function IntegrationsSection({
  integrations,
}: {
  integrations: Integration[];
}) {
  const connected = integrations.filter((i) => i.status !== "available");
  const available = integrations.filter((i) => i.status === "available");

  return (
    <div className="space-y-6">
      <p className="text-xs text-text-muted">
        Third-party service connections for notifications, signatures, and data
        sync.
      </p>

      {connected.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Connected
          </h3>
          <div className="space-y-3">
            {connected.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Available
          </h3>
          <div className="space-y-3">
            {available.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const cfg = INTEGRATION_STATUS_CONFIG[integration.status];
  const isConnected = integration.status !== "available";

  return (
    <div className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-raised p-4 transition-colors hover:bg-surface-overlay">
      <div className="flex items-center gap-3">
        <span
          className={`inline-block h-2 w-2 rounded-full ${cfg.dotColor}`}
          aria-label={`${cfg.label} status`}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {integration.name}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cfg.color}`}
            >
              {cfg.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {integration.description}
          </p>
          {integration.account && (
            <p className="mt-0.5 text-[11px] text-text-muted">
              {integration.account}
              {integration.features && (
                <> &middot; {integration.features.join(", ")}</>
              )}
            </p>
          )}
        </div>
      </div>
      <button
        className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
          isConnected
            ? "border-surface-border bg-surface-overlay text-text-secondary hover:text-text-primary"
            : "border-accent-primary/30 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20"
        }`}
      >
        {isConnected ? "Manage" : "Connect"}
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
