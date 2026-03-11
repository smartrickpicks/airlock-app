"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Cpu, CircleCheckBig, TriangleAlert, Circle } from "lucide-react";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { MOCK_AI_PROVIDERS } from "@/lib/mock-admin";
import { fadeInUp } from "@/lib/animations";

const EMPTY_CONFIG: Record<string, unknown> = {};

const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "bg-accent-success/15 text-accent-success",
    dotColor: "bg-accent-success",
  },
  fallback: {
    label: "Fallback",
    color: "bg-accent-warning/15 text-accent-warning",
    dotColor: "bg-accent-warning",
  },
  offline: {
    label: "Offline",
    color: "bg-text-muted/15 text-text-muted",
    dotColor: "bg-text-muted",
  },
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 6) + "••••••••••••••••••••••••••••" + key.slice(-4);
}

export default function AdminAiProviderPage() {
  const aiConfig = useCapabilityTreeStore(
    (s) => s.nodeConfigs["ai_provider"] ?? EMPTY_CONFIG,
  ) as {
    provider?: string;
    apiKey?: string;
    model?: string;
  };
  const aiState = useCapabilityTreeStore(
    (s) => s.nodeStates["ai_provider"] ?? "available",
  );

  const isConfigured = aiState === "configured" && Boolean(aiConfig.apiKey);
  const configuredProvider = aiConfig.provider ?? "";
  const configuredModel = aiConfig.model ?? "";
  const configuredKey = aiConfig.apiKey ?? "";

  // Mark admin checklist when AI provider is configured
  useEffect(() => {
    if (isConfigured) {
      useOnboardingStore.getState().completeAdminItem("set_calibration");
    }
  }, [isConfigured]);

  return (
    <motion.div className="h-full overflow-y-auto p-6" {...fadeInUp}>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/15">
              <Cpu size={20} className="text-accent-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">
                AI Provider
              </h1>
              <p className="text-sm text-text-secondary">
                Configure the LiteLLM gateway that powers Otto and contract
                extraction. Requests fall through providers in order.
              </p>
            </div>
          </div>
        </div>

        {/* Active Connection from Capability Tree */}
        <div
          className={`rounded-lg border p-4 ${
            isConfigured
              ? "border-accent-success/30 bg-accent-success/5"
              : "border-accent-warning/30 bg-accent-warning/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConfigured ? (
                <CircleCheckBig size={18} className="text-accent-success" />
              ) : (
                <TriangleAlert size={18} className="text-accent-warning" />
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {isConfigured
                    ? `Connected via ${configuredProvider}`
                    : "Not configured"}
                </p>
                <p className="text-xs text-text-muted">
                  {isConfigured
                    ? `Model: ${configuredModel}`
                    : "Configure AI Provider in the Capability Tree to activate Otto"}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isConfigured
                  ? "bg-accent-success/15 text-accent-success"
                  : "bg-accent-warning/15 text-accent-warning"
              }`}
            >
              {isConfigured ? "Connected" : "Pending"}
            </span>
          </div>
          {isConfigured && (
            <div className="mt-3 rounded-md border border-surface-border bg-surface-base px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-text-muted">
                  {maskKey(configuredKey)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* LiteLLM Gateway Providers (mock) */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            LiteLLM Gateway Routing
          </h2>
          <div className="space-y-3">
            {MOCK_AI_PROVIDERS.map((provider, i) => {
              const status = STATUS_CONFIG[provider.status];
              // If this mock provider matches the configured capability tree provider, show as active
              const isActive =
                isConfigured &&
                ((configuredProvider === "Anthropic" &&
                  provider.id === "claude") ||
                  (configuredProvider === "OpenRouter" &&
                    provider.id === "openai") ||
                  (configuredProvider === "Custom" &&
                    provider.id === "ollama"));

              return (
                <div
                  key={provider.id}
                  className={`rounded-lg border bg-surface-raised transition-colors ${
                    isActive
                      ? "border-accent-success/30"
                      : "border-surface-border"
                  }`}
                >
                  <div className="flex items-start justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-text-muted">
                          #{i + 1}
                        </span>
                        <span className="text-sm font-semibold text-text-primary">
                          {provider.label}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                        {isActive && (
                          <Circle
                            size={8}
                            className="fill-accent-success text-accent-success"
                          />
                        )}
                      </div>
                      <p className="mt-1 font-mono text-xs text-text-secondary">
                        {provider.model}
                      </p>
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
        </div>

        {/* Routing Logic */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-2 text-xs font-semibold text-text-primary">
            Routing logic
          </h3>
          <p className="text-xs text-text-secondary">
            {isConfigured ? (
              <>
                Requests route to{" "}
                <strong className="text-text-primary">
                  {configuredProvider} / {configuredModel}
                </strong>{" "}
                via the Capability Tree configuration. On 5xx errors or rate
                limits, traffic falls through the LiteLLM gateway providers
                above in order.
              </>
            ) : (
              <>
                Configure an AI Provider in the{" "}
                <strong className="text-text-primary">Capability Tree</strong>{" "}
                to activate Otto. Once configured, requests will route through
                the selected provider with fallback to the LiteLLM gateway.
              </>
            )}
          </p>
        </div>

        {/* Debug */}
        <details className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <summary className="cursor-pointer text-xs font-medium text-text-muted">
            Debug State
          </summary>
          <pre className="mt-2 text-[10px] text-text-muted">
            {JSON.stringify(
              {
                aiState,
                configuredProvider,
                configuredModel,
                hasKey: Boolean(configuredKey),
              },
              null,
              2,
            )}
          </pre>
        </details>
      </div>
    </motion.div>
  );
}
