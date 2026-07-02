"use client";

import { useState } from "react";
import { Server, ChevronDown, ChevronRight, Shield, Plug } from "lucide-react";
import {
  MOCK_MCP_SERVERS,
  MCP_STATUS_CONFIG,
  type McpServer,
  type McpTool,
} from "@/lib/mock-connectors";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

const EMPTY_CONFIG: Record<string, unknown> = {};

export default function AdminMcpServersPage() {
  const config = useCapabilityTreeStore(
    (s) => s.nodeConfigs["mcp_servers"] ?? EMPTY_CONFIG,
  );
  const state = useCapabilityTreeStore(
    (s) => s.nodeStates["mcp_servers"] ?? "available",
  );

  const servers = MOCK_MCP_SERVERS;
  const totalTools = servers.reduce((sum, s) => sum + s.toolCount, 0);
  const activeCount = servers.filter((s) => s.status === "active").length;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15">
              <Server size={20} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">
                MCP Servers
              </h1>
              <p className="text-sm text-text-secondary">
                Model Context Protocol servers provide tools that Otto and
                Skills can use.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-surface-border bg-surface-raised p-3 text-center">
            <p className="text-xl font-bold text-text-primary">
              {servers.length}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-text-muted">
              Servers
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-raised p-3 text-center">
            <p className="text-xl font-bold text-accent-success">
              {activeCount}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-text-muted">
              Active
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-raised p-3 text-center">
            <p className="text-xl font-bold text-accent-primary">
              {totalTools}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-text-muted">
              Total Tools
            </p>
          </div>
        </div>

        {/* Add Server Button */}
        <div className="flex justify-end">
          <button className="rounded-md border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary">
            + Add Server
          </button>
        </div>

        {/* Server List */}
        <div className="space-y-3">
          {servers.map((server) => (
            <McpServerCard key={server.id} server={server} />
          ))}
        </div>

        {/* Debug */}
        <details className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <summary className="cursor-pointer text-xs font-medium text-text-muted">
            Debug State
          </summary>
          <pre className="mt-2 text-[10px] text-text-muted">
            {JSON.stringify({ state, config }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function McpServerCard({ server }: { server: McpServer }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = MCP_STATUS_CONFIG[server.status];

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised transition-colors hover:bg-surface-overlay">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Plug size={14} className="text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">
              {server.name}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusCfg.color}`}
            >
              {statusCfg.label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-text-muted">
            <span>{server.host}</span>
            <span>&middot;</span>
            <span>{server.toolCount} tools</span>
            <span>&middot;</span>
            <span>{server.authType}</span>
            {server.creditsUsed !== undefined && (
              <>
                <span>&middot;</span>
                <span>
                  {server.creditsUsed}/{server.creditsTotal} credits
                </span>
              </>
            )}
          </div>
          {server.statusMessage && (
            <p className="mt-1 text-[11px] text-accent-danger">
              {server.statusMessage}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronDown size={14} className="text-text-muted" />
        ) : (
          <ChevronRight size={14} className="text-text-muted" />
        )}
      </button>

      {expanded && server.tools.length > 0 && (
        <div className="border-t border-surface-border px-4 pb-4 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Tools
          </p>
          <div className="space-y-1.5">
            {server.tools.map((tool) => (
              <ToolRow key={tool.name} tool={tool} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolRow({ tool }: { tool: McpTool }) {
  const allowedRoles = Object.entries(tool.roles)
    .filter(([, allowed]) => allowed)
    .map(([role]) => role);

  return (
    <div className="flex items-center justify-between rounded border border-surface-border/50 bg-surface-base px-3 py-1.5">
      <div>
        <span className="font-mono text-[11px] text-accent-primary">
          {tool.name}
        </span>
        <span className="ml-2 text-[10px] text-text-muted">
          {tool.description}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Shield size={10} className="text-text-muted" />
        <span className="text-[9px] text-text-muted">
          {allowedRoles.join(", ")}
        </span>
      </div>
    </div>
  );
}
