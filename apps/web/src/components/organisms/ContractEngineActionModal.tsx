"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Modal from "@/components/molecules/Modal";
import Button from "@/components/atoms/Button";
import {
  getContractEngineInput,
  runExtractionEngine,
  runPreflightEngine,
  type EngineExtractionResponse,
  type EnginePreflightResponse,
} from "@/lib/contract-engines";
import { useExtractionStore } from "@/stores/extraction.store";
import { useVaultStore } from "@/stores/vault.store";
import type { Vault } from "@/stores/vault.store";

interface ContractEngineActionModalProps {
  vault: Vault | null;
  mode: "preflight" | "extraction" | null;
  onClose: () => void;
}

export default function ContractEngineActionModal({
  vault,
  mode,
  onClose,
}: ContractEngineActionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<EnginePreflightResponse | null>(
    null,
  );
  const [extraction, setExtraction] = useState<EngineExtractionResponse | null>(
    null,
  );
  const [didRun, setDidRun] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!vault || !mode) return;
      const hasLinkedDocument = Boolean(
        (vault.metadata as Record<string, unknown>).source_document_id,
      );
      const input = hasLinkedDocument ? null : getContractEngineInput(vault.id);
      if (!hasLinkedDocument && !input) {
        setError("No engine input is available for this vault.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setPreflight(null);
      setExtraction(null);

      try {
        if (mode === "preflight") {
          const result = hasLinkedDocument
            ? await apiFetch<EnginePreflightResponse>(
                `/api/v1/vaults/${vault.id}/run-preflight`,
                { method: "POST" },
              )
            : await runPreflightEngine(input!);
          if (!cancelled) {
            setPreflight(result);
            setDidRun(true);
          }
        } else {
          const result = hasLinkedDocument
            ? await apiFetch<EngineExtractionResponse>(
                `/api/v1/vaults/${vault.id}/run-extraction`,
                { method: "POST" },
              )
            : await runExtractionEngine(input!);
          if (!cancelled) {
            setExtraction(result);
            setDidRun(true);
          }
        }
      } catch (engineError) {
        if (!cancelled) {
          setError(
            engineError instanceof Error
              ? engineError.message
              : "Engine request failed",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mode, vault]);

  if (!vault || !mode) return null;

  const metadata = vault.metadata as Record<string, string>;
  const title = mode === "preflight" ? "Run Preflight Check" : "Run Extraction";
  const extractionEntries = extraction
    ? Object.entries(extraction.results).slice(0, 12)
    : [];

  return (
    <Modal isOpen={Boolean(mode)} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          {mode === "preflight"
            ? "Runs the real preflight engine against the linked contract text for this vault."
            : "Runs the real extraction engine against the linked contract text for this vault."}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Vault" value={vault.name} />
          <MetricCard label="Entity" value={metadata.entity || "Unknown"} />
          <MetricCard
            label="Contract Type"
            value={metadata.contract_type || "Contract"}
          />
          <MetricCard label="Health" value={`${vault.health_score ?? 0}%`} />
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-overlay p-3 text-sm text-text-secondary">
          {isLoading
            ? "Running engine..."
            : "Next demo step: open the inspector to review extracted fields, then go to the patch editor if you want to stage a correction."}
        </div>

        {error ? (
          <div className="rounded-lg border border-accent-danger/20 bg-accent-danger/10 px-3 py-2 text-sm text-accent-danger">
            {error}
          </div>
        ) : null}

        {preflight ? (
          <div className="space-y-3 rounded-lg border border-surface-border bg-surface-raised p-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Doc Mode" value={preflight.doc_mode} />
              <MetricCard label="Gate" value={preflight.gate_color} />
              <MetricCard
                label="Health"
                value={`${Math.round((preflight.health_score.calibrated_score ?? 0) * 100)}%`}
              />
              <MetricCard
                label="Band"
                value={preflight.health_score.band || "unknown"}
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Gate Reasons
              </div>
              <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                {preflight.gate_reasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {extraction ? (
          <div className="space-y-3 rounded-lg border border-surface-border bg-surface-raised p-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Extracted Fields"
                value={`${Object.keys(extraction.results).length}`}
              />
              <MetricCard label="Call Site" value="web_demo" />
            </div>
            <div className="space-y-2">
              {extractionEntries.map(([code, check]) => (
                <div
                  key={code}
                  className="rounded-lg border border-surface-border bg-surface-overlay px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-text-primary">
                      {code}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">
                      {Math.round((check.confidence ?? 0) * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {check.value === null ? "--" : String(check.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (didRun && vault) {
                // Refresh extraction store + vault data so RecordInspector picks up new results
                void useExtractionStore.getState().fetchExtraction(vault.id);
                void useVaultStore.getState().fetchVault(vault.id);
                setDidRun(false);
              }
              onClose();
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
