"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/atoms/Button";
import FileDropZone from "@/components/organisms/FileDropZone";
import { useIntakeStore } from "@/stores/intake.store";
import type { EngineExtractionCheck } from "@/lib/contract-engines";

const ENTRY_POINTS = [
  { label: "PDF Upload", status: "active", detail: "Authoritative proof path" },
  { label: "Google Drive Import", status: "planned", detail: "Visible later" },
  { label: "Email Intake", status: "planned", detail: "Provider-wired later" },
  { label: "Text Intake", status: "planned", detail: "Provider-wired later" },
  { label: "Web Intake", status: "planned", detail: "Endpoint-wired later" },
];

const STEP_ORDER = [
  "upload",
  "parsing",
  "preflight",
  "extraction",
  "done",
] as const;

export default function ContractIntakePage() {
  const router = useRouter();
  const {
    document,
    vault,
    intakeStep,
    isUploading,
    error,
    preflight,
    extraction,
    uploadDocument,
    createVaultFromDocument,
    reset,
  } = useIntakeStore();
  const [vaultName, setVaultName] = useState("");
  const [isCreatingVault, setIsCreatingVault] = useState(false);

  const suggestedName = useMemo(() => {
    if (!document?.filename) return "";
    return document.filename
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();
  }, [document?.filename]);

  useEffect(() => {
    if (suggestedName && !vaultName) {
      setVaultName(suggestedName);
    }
  }, [suggestedName, vaultName]);

  async function handleCreateVault(): Promise<void> {
    if (!vaultName.trim()) return;
    setIsCreatingVault(true);
    try {
      const created = await createVaultFromDocument(vaultName.trim());
      router.push(`/contracts/${created.slug}`);
    } catch (createError) {
      console.error(createError);
    } finally {
      setIsCreatingVault(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="flex flex-shrink-0 items-start justify-between px-6 pt-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Contract Intake Lab
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track B proof path. Upload one PDF, parse the real text, run
            preflight, and run extraction before any vault creation logic.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setVaultName("");
            reset();
          }}
        >
          Reset Lab
        </Button>
      </div>

      {/* Three-column body */}
      <div className="flex min-h-0 flex-1 gap-6 px-6 pb-6 pt-4">
        {/* Left — Entry Points */}
        <div className="w-[200px] flex-shrink-0 overflow-y-auto rounded-2xl border border-surface-border bg-surface-raised p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Entry Points
          </div>
          <div className="mt-4 space-y-3">
            {ENTRY_POINTS.map((entry) => (
              <div
                key={entry.label}
                className={`rounded-xl border px-3 py-3 ${
                  entry.status === "active"
                    ? "border-accent-primary/40 bg-accent-primary/10"
                    : "border-surface-border bg-surface-overlay"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {entry.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    {entry.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {entry.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Center — Upload + Parsed Text (fills remaining height) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <FileDropZone
            isBusy={isUploading}
            onFileSelected={(file) => void uploadDocument(file)}
          />

          {/* Status pills */}
          <div className="flex flex-wrap gap-2">
            {STEP_ORDER.map((step) => {
              const isActive = intakeStep === step;
              const isDone =
                STEP_ORDER.indexOf(step) <
                Math.max(
                  STEP_ORDER.indexOf(intakeStep as (typeof STEP_ORDER)[number]),
                  0,
                );
              return (
                <span
                  key={step}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isActive
                      ? "bg-accent-primary/15 text-accent-primary"
                      : isDone
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-surface-overlay text-text-muted"
                  }`}
                >
                  {step}
                </span>
              );
            })}
          </div>

          {error ? (
            <div className="rounded-xl border border-accent-danger/20 bg-accent-danger/10 px-4 py-3 text-sm text-accent-danger">
              {error}
            </div>
          ) : null}

          {/* Parsed document — fills remaining space */}
          {document ? (
            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-surface-border bg-surface-raised p-4">
              <div className="flex flex-shrink-0 items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {document.filename}
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    Status: {document.status} • Pages:{" "}
                    {document.page_count ?? "—"}
                  </div>
                </div>
                <span className="rounded-full bg-surface-overlay px-3 py-1 text-xs text-text-secondary">
                  {document.file_format.toUpperCase()}
                </span>
              </div>

              {document.full_text ? (
                <pre className="mt-3 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-surface-overlay p-3 text-xs leading-5 text-text-secondary">
                  {document.full_text}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Right — Preflight, Extraction, Create Vault (scrolls independently) */}
        <div className="w-[320px] flex-shrink-0 space-y-4 overflow-y-auto">
          <section className="rounded-2xl border border-surface-border bg-surface-raised p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Preflight
            </div>
            {preflight ? (
              <div className="mt-3 space-y-3">
                <Metric label="Doc Mode" value={preflight.doc_mode} />
                <Metric label="Gate" value={preflight.gate_color} />
                <Metric
                  label="Health"
                  value={`${Math.round((preflight.health_score.calibrated_score ?? 0) * 100)}%`}
                />
                <ul className="space-y-1 text-xs text-text-secondary">
                  {preflight.gate_reasons.map((reason: string) => (
                    <li key={reason}>- {reason}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-text-muted">
                Upload a PDF to run the real preflight engine.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-raised p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Extraction
            </div>
            {extraction ? (
              <div className="mt-3 space-y-2">
                <Metric
                  label="Checks"
                  value={String(Object.keys(extraction.results).length)}
                />
                <div className="space-y-2">
                  {Object.entries(
                    extraction.results as Record<string, EngineExtractionCheck>,
                  )
                    .slice(0, 5)
                    .map(([code, result]) => (
                      <div
                        key={code}
                        className="rounded-lg border border-surface-border bg-surface-overlay px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-text-primary">
                            {code}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-text-muted">
                            {Math.round((result.confidence ?? 0) * 100)}%
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-text-secondary">
                          {result.value === null ? "--" : String(result.value)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-text-muted">
                Extraction results appear here after parsing succeeds.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-raised p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Create Vault
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Turn this parsed contract into a live contract vault. The linked
              document, real preflight result, and real extraction output will
              travel with it.
            </p>
            <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Vault Name
            </label>
            <input
              value={vaultName}
              onChange={(event) => setVaultName(event.target.value)}
              placeholder="Inbound contract vault name"
              className="mt-2 w-full rounded-lg border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent-primary"
            />
            <Button
              className="mt-4 w-full"
              onClick={() => void handleCreateVault()}
              disabled={
                isCreatingVault ||
                !document ||
                !preflight ||
                !extraction ||
                !vaultName.trim()
              }
            >
              {isCreatingVault ? "Creating Vault..." : "Create Contract Vault"}
            </Button>
            {vault ? (
              <p className="mt-3 text-xs text-emerald-300">
                Ready. Redirecting to {vault.name}.
              </p>
            ) : (
              <p className="mt-3 text-xs text-text-muted">
                Chamber state will be assigned from the real intake result, not
                set manually.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
