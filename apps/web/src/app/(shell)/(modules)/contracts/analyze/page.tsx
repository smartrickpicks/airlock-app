"use client";

import { useCallback, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReadinessCheck {
  code: string;
  label: string;
  value: string | null;
  confidence: number | null;
  evidence: string | null;
  status: string;
}

interface ReadinessSection {
  score: number;
  checks: ReadinessCheck[];
}

interface FieldResult {
  value: string | null;
  confidence: number | null;
  tier: string;
  raw_text: string | null;
  extractor: string | null;
}

interface AnalyzeResult {
  filename: string;
  page_count: number;
  full_text_length: number;
  doc_mode: string;
  gate_color: "RED" | "YELLOW" | "GREEN";
  gate_reasons: string[];
  health_score: {
    raw_score: number;
    calibrated_score: number;
    band: string;
    section_scores: Record<string, number>;
  };
  opportunities_readiness: ReadinessSection | null;
  schedule_readiness: ReadinessSection | null;
  financials_readiness: ReadinessSection | null;
  entity_resolution: { score: number; checks: ReadinessCheck[] } | null;
  contract_classification: { normalized_contract_type: string } | null;
  extracted_fields: Record<string, FieldResult>;
  field_summary: { high: number; medium: number; low: number; missing: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gateClasses(color: string) {
  if (color === "GREEN")
    return {
      bg: "bg-accent-success/10 border-accent-success/30",
      dot: "bg-accent-success",
      text: "text-accent-success",
    };
  if (color === "YELLOW")
    return {
      bg: "bg-accent-warning/10 border-accent-warning/30",
      dot: "bg-accent-warning",
      text: "text-accent-warning",
    };
  return {
    bg: "bg-accent-danger/10 border-accent-danger/30",
    dot: "bg-accent-danger",
    text: "text-accent-danger",
  };
}

function confColor(conf: number | null) {
  if (conf === null || conf < 0.4) return "bg-accent-danger";
  if (conf < 0.65) return "bg-orange-500";
  if (conf < 0.85) return "bg-accent-warning";
  return "bg-accent-success";
}

function confLabel(conf: number | null) {
  if (conf === null || conf < 0.4) return "Very Low";
  if (conf < 0.65) return "Low";
  if (conf < 0.85) return "Medium";
  return "High";
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReadinessCard({
  title,
  section,
}: {
  title: string;
  section: ReadinessSection | null;
}) {
  if (!section) return null;
  const score = section.score ?? 0;
  const checks = section.checks ?? [];
  const passing = checks.filter((c) => c.status === "pass").length;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <span
          className={`text-sm font-semibold ${score >= 0.7 ? "text-accent-success" : score >= 0.4 ? "text-accent-warning" : "text-accent-danger"}`}
        >
          {pct(score)}
        </span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
        <div
          className={`h-full rounded-full transition-all ${score >= 0.7 ? "bg-accent-success" : score >= 0.4 ? "bg-accent-warning" : "bg-accent-danger"}`}
          style={{ width: pct(score) }}
        />
      </div>
      <div className="space-y-1.5">
        {checks.slice(0, 6).map((c) => (
          <div key={c.code} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 shrink-0 font-mono ${c.status === "pass" ? "text-accent-success" : "text-accent-danger"}`}
            >
              {c.status === "pass" ? "✓" : "✗"}
            </span>
            <span className="text-text-secondary">{c.label || c.code}</span>
            {c.value && (
              <span className="ml-auto shrink-0 text-text-muted">
                {String(c.value).slice(0, 30)}
              </span>
            )}
          </div>
        ))}
        {checks.length > 6 && (
          <p className="text-xs text-text-muted">
            +{checks.length - 6} more ({passing}/{checks.length} passing)
          </p>
        )}
      </div>
    </div>
  );
}

function FieldCard({ code, field }: { code: string; field: FieldResult }) {
  const conf = field.confidence;
  const val = field.value;
  if (!val && (conf === null || conf < 0.1)) return null;

  return (
    <div className="rounded border border-surface-border bg-surface-raised p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-text-muted">{code}</span>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${confColor(conf)}`} />
          <span className="text-[10px] text-text-muted">{confLabel(conf)}</span>
          {conf !== null && (
            <span className="text-[10px] font-medium text-text-secondary">
              {pct(conf)}
            </span>
          )}
        </div>
      </div>
      {val ? (
        <p className="text-sm text-text-primary">{String(val).slice(0, 80)}</p>
      ) : (
        <p className="text-sm italic text-text-muted">— not found —</p>
      )}
      {field.raw_text && val !== field.raw_text && (
        <p className="mt-1 truncate text-[10px] text-text-muted">
          &ldquo;{field.raw_text.slice(0, 60)}&rdquo;
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyze = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    setError(null);
    setResult(null);
    setIsLoading(true);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/v1/engines/analyze`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || "Analysis failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) analyze(file);
    },
    [analyze],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) analyze(file);
      e.target.value = "";
    },
    [analyze],
  );

  const gate = result ? gateClasses(result.gate_color) : null;

  const fieldEntries = result
    ? Object.entries(result.extracted_fields).filter(
        ([, f]) => f.value || (f.confidence !== null && f.confidence >= 0.1),
      )
    : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Contract Analyzer
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Drop a PDF to run preflight + field extraction in real time. No storage — results only.
        </p>
      </div>

      {/* Drop zone */}
      {!result && !isLoading && (
        <div
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-16 transition-colors cursor-pointer ${
            isDragging
              ? "border-accent-brand bg-accent-brand/5"
              : "border-surface-border bg-surface-raised hover:border-text-muted"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-overlay">
            <svg
              className="h-6 w-6 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-primary">
            Drop a contract PDF here
          </p>
          <p className="mt-1 text-xs text-text-muted">or click to browse</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-surface-border bg-surface-raised py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent-brand" />
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary">
              Running preflight + extraction…
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              OCR → chunking → field extraction → confidence scoring
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-accent-danger/30 bg-accent-danger/10 px-4 py-3 text-sm text-accent-danger">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Gate + summary bar */}
          <div
            className={`flex flex-wrap items-center gap-4 rounded-xl border px-5 py-4 ${gate!.bg}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${gate!.dot}`} />
              <span className={`text-lg font-bold ${gate!.text}`}>
                {result.gate_color}
              </span>
            </div>
            <div className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {result.filename}
              </span>{" "}
              · {result.page_count}p ·{" "}
              {(result.full_text_length / 1000).toFixed(1)}k chars ·{" "}
              {result.doc_mode}
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-text-muted">Health Score</p>
              <p className={`text-xl font-bold ${gate!.text}`}>
                {Math.round((result.health_score.calibrated_score ?? 0) * 100)}
                <span className="text-sm font-normal">%</span>
              </p>
            </div>
          </div>

          {/* Contract type + gate reasons */}
          <div className="flex flex-wrap gap-2">
            {result.contract_classification?.normalized_contract_type && (
              <span className="rounded-full bg-surface-overlay px-3 py-1 text-xs font-medium text-text-secondary">
                {result.contract_classification.normalized_contract_type}
              </span>
            )}
            {result.gate_reasons.map((r) => (
              <span
                key={r}
                className="rounded-full bg-accent-danger/10 px-3 py-1 text-xs text-accent-danger"
              >
                {r}
              </span>
            ))}
          </div>

          {/* Field summary chips */}
          <div className="flex flex-wrap gap-3">
            {[
              {
                label: "High confidence",
                n: result.field_summary.high,
                color: "text-accent-success",
                dot: "bg-accent-success",
              },
              {
                label: "Medium",
                n: result.field_summary.medium,
                color: "text-accent-warning",
                dot: "bg-accent-warning",
              },
              {
                label: "Low",
                n: result.field_summary.low,
                color: "text-orange-400",
                dot: "bg-orange-400",
              },
              {
                label: "Not found",
                n: result.field_summary.missing,
                color: "text-text-muted",
                dot: "bg-text-muted",
              },
            ].map(({ label, n, color, dot }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-raised px-3 py-1"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <span className={`text-xs font-semibold ${color}`}>{n}</span>
                <span className="text-xs text-text-muted">{label}</span>
              </div>
            ))}
          </div>

          {/* Readiness sections */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReadinessCard
              title="Opportunities"
              section={result.opportunities_readiness}
            />
            <ReadinessCard
              title="Financials"
              section={result.financials_readiness}
            />
            <ReadinessCard
              title="Schedule"
              section={result.schedule_readiness}
            />
            {result.entity_resolution && (
              <ReadinessCard
                title="Entity Resolution"
                section={result.entity_resolution as ReadinessSection}
              />
            )}
          </div>

          {/* Extracted fields */}
          {fieldEntries.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Extracted Fields ({fieldEntries.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {fieldEntries.map(([code, field]) => (
                  <FieldCard key={code} code={code} field={field} />
                ))}
              </div>
            </div>
          )}

          {/* Re-analyze button */}
          <div>
            <button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              className="rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Analyze another contract
            </button>
          </div>
        </>
      )}
    </div>
  );
}
