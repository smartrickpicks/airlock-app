"use client";

import { useState } from "react";
import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

const PROVIDERS = ["Anthropic", "OpenRouter", "Custom"];
const MODELS = ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"];

export default function AiProviderConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const [provider, setProvider] = useState(
    (config.provider as string) ?? "Anthropic",
  );
  const [apiKey, setApiKey] = useState((config.apiKey as string) ?? "");
  const [model, setModel] = useState(
    (config.model as string) ?? "claude-sonnet-4-6",
  );
  const [showKey, setShowKey] = useState(false);

  const canSave = apiKey.trim().length > 0;
  const isConnected = canSave;

  return (
    <div className="space-y-3 p-4">
      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-text-secondary">
          Provider
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full rounded border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-text-secondary">
          API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded border border-surface-border bg-surface-raised px-3 py-2 pr-16 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-[10px] font-medium text-text-muted hover:text-text-primary"
          >
            {showKey ? "HIDE" : "SHOW"}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-text-secondary">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 rounded border border-surface-border bg-surface-raised/50 px-3 py-2">
        <span
          className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className="text-xs text-text-secondary">
          {isConnected ? "Connected" : "Not configured"}
        </span>
      </div>

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
          onClick={() => onSave({ provider, apiKey, model })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
