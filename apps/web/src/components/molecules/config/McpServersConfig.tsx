"use client";

import { useState } from "react";
import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

export default function McpServersConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const [servers, setServers] = useState<string[]>(
    (config.servers as string[]) ?? [],
  );
  const [input, setInput] = useState("");

  const canSave = servers.length > 0;

  const addServer = () => {
    const trimmed = input.trim();
    if (trimmed && !servers.includes(trimmed)) {
      setServers([...servers, trimmed]);
      setInput("");
    }
  };

  const removeServer = (url: string) => {
    setServers(servers.filter((s) => s !== url));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addServer();
    }
  };

  return (
    <div className="space-y-3 p-4">
      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-text-secondary">
          Server URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://mcp.example.com"
            className="flex-1 rounded border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={addServer}
            className="rounded bg-surface-raised px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-border hover:text-text-primary"
          >
            Add Server
          </button>
        </div>
      </div>

      {servers.length > 0 && (
        <div className="space-y-1">
          {servers.map((url) => (
            <div
              key={url}
              className="flex items-center justify-between rounded border border-surface-border bg-surface-raised/50 px-3 py-2"
            >
              <span className="truncate text-xs text-text-primary">{url}</span>
              <button
                type="button"
                onClick={() => removeServer(url)}
                className="ml-2 shrink-0 text-xs text-text-muted hover:text-text-primary"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-surface-border px-4 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave({ servers })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
