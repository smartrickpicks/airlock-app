"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Shield,
  Wrench,
  MessageSquareText,
  BrainCircuit,
  ScanEye,
} from "lucide-react";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

const EMPTY_CONFIG: Record<string, unknown> = {};

const OTTO_TOOLS = [
  { name: "get_gate_status", desc: "Read vault gate color and health score" },
  { name: "get_field_summary", desc: "List pass/fail/review field counts" },
  { name: "get_open_patches", desc: "Show pending correction patches" },
  { name: "get_contract_health", desc: "Overall contract quality score" },
  { name: "get_preflight_status", desc: "Pre-ship quality gate checks" },
  { name: "get_deal_fields", desc: "Territory, type, term, and value" },
  { name: "get_extraction_meta", desc: "Document extraction confidence" },
  { name: "get_corpus_context", desc: "Relevant clause text from corpus" },
  { name: "search_vaults", desc: "Search across vault metadata" },
  { name: "get_timeline", desc: "Event history for a vault" },
  { name: "suggest_patch", desc: "Propose a field correction (draft only)" },
  { name: "run_preflight", desc: "Trigger preflight check on demand" },
];

const BEHAVIORAL_RULES = [
  { icon: Shield, rule: "Propose patches as drafts — never auto-apply" },
  {
    icon: ScanEye,
    rule: "Self-approval blocked — AI patches need human review",
  },
  { icon: MessageSquareText, rule: "Max 8 tool calls per message" },
  { icon: BrainCircuit, rule: "Always cite enrichment sources in responses" },
];

export default function AdminOttoPage() {
  const config = useCapabilityTreeStore(
    (s) => s.nodeConfigs["otto"] ?? EMPTY_CONFIG,
  );
  const ottoState = useCapabilityTreeStore(
    (s) => s.nodeStates["otto"] ?? "available",
  );
  const aiProviderState = useCapabilityTreeStore(
    (s) => s.nodeStates["ai_provider"] ?? "available",
  );
  const aiConfig = useCapabilityTreeStore(
    (s) => s.nodeConfigs["ai_provider"],
  ) as { provider?: string; model?: string; apiKey?: string } | undefined;

  // Defer store-derived values until after hydration to avoid SSR mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const aiConnected = mounted && aiProviderState === "configured";
  const providerLabel = mounted
    ? (aiConfig?.provider ?? "Not configured")
    : "Not configured";
  const modelLabel = mounted ? (aiConfig?.model ?? "—") : "—";
  const hasKey = mounted && Boolean(aiConfig?.apiKey);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/15">
              <Bot size={20} className="text-accent-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">OTTO</h1>
              <p className="text-sm text-text-secondary">
                AI assistant for vault analysis, risk detection, and task
                management.
              </p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${aiConnected && hasKey ? "bg-accent-success" : "bg-[var(--accent-warning)]"}`}
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {aiConnected && hasKey ? "Online" : "Waiting for AI Provider"}
                </p>
                <p className="text-xs text-text-muted">
                  {aiConnected
                    ? `${providerLabel} / ${modelLabel}`
                    : "Configure AI Provider in the capability tree to activate Otto"}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                aiConnected && hasKey
                  ? "bg-accent-success/15 text-accent-success"
                  : "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)]"
              }`}
            >
              {aiConnected && hasKey ? "Active" : "Standby"}
            </span>
          </div>
        </div>

        {/* System Prompt Preview */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText size={14} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">
              System Prompt
            </h2>
          </div>
          <div className="rounded border border-surface-border bg-surface-base p-3">
            <p className="font-mono text-[11px] leading-relaxed text-text-secondary">
              You are Otto, the AI assistant inside Airlock — an enterprise data
              operations platform for contract lifecycle management. Your role:
              help analysts understand vault data, identify issues, and propose
              corrections. Always cite enrichment sources. Never take autonomous
              actions — propose and let humans approve.
            </p>
          </div>
          <p className="mt-2 text-[10px] text-text-muted">
            System prompt is auto-injected with vault context (gate status,
            health score, field summary, open patches, user role) at runtime.
          </p>
        </div>

        {/* Behavioral Rules */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center gap-2">
            <Shield size={14} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">
              Behavioral Rules
            </h2>
          </div>
          <div className="space-y-2">
            {BEHAVIORAL_RULES.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <item.icon
                  size={12}
                  className="flex-shrink-0 text-text-muted"
                />
                <p className="text-xs text-text-secondary">{item.rule}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Available Tools */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-text-muted" />
              <h2 className="text-sm font-semibold text-text-primary">
                Available Tools
              </h2>
            </div>
            <span className="text-[10px] text-text-muted">
              {OTTO_TOOLS.length} tools
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {OTTO_TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between rounded border border-surface-border/50 bg-surface-base px-3 py-1.5"
              >
                <span className="font-mono text-[11px] text-accent-primary">
                  {tool.name}
                </span>
                <span className="text-[10px] text-text-muted">{tool.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Enrichment Sources */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">
              Enrichment Sources
            </h2>
          </div>
          <p className="mb-3 text-xs text-text-secondary">
            Otto automatically gathers context from these sources before each
            response.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Gate State",
              "Field Summary",
              "Contract Health",
              "Domain Rules",
              "Preflight Sections",
              "Corpus Lines",
              "Extraction Meta",
              "Patch Summary",
              "Deal Fields",
            ].map((source) => (
              <span
                key={source}
                className="rounded-full border border-surface-border bg-surface-base px-2.5 py-0.5 text-[10px] font-medium text-text-secondary"
              >
                {source}
              </span>
            ))}
          </div>
        </div>

        {/* Debug state (only in dev) */}
        <details className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <summary className="cursor-pointer text-xs font-medium text-text-muted">
            Debug State
          </summary>
          <pre className="mt-2 text-[10px] text-text-muted">
            {JSON.stringify({ ottoState, aiProviderState, config }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
