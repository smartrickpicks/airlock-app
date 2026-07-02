"use client";

interface ProgressStep {
  label: string;
  status: "pending" | "active" | "complete" | "failed";
}

interface ProgressTrackerEmbedProps {
  operationName: string;
  steps: ProgressStep[];
  currentStep: number;
}

const STEP_COLORS: Record<string, { dot: string; text: string }> = {
  pending: { dot: "bg-text-muted/40", text: "text-text-muted" },
  active: { dot: "bg-[#00D1FF]", text: "text-[#00D1FF]" },
  complete: { dot: "bg-accent-success", text: "text-accent-success" },
  failed: { dot: "bg-accent-danger", text: "text-accent-danger" },
};

export default function ProgressTrackerEmbed({
  operationName,
  steps,
  currentStep,
}: ProgressTrackerEmbedProps) {
  const completedCount = steps.filter((s) => s.status === "complete").length;
  const pct =
    steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Progress
        </span>
        <span className="text-[10px] font-semibold text-text-secondary">
          {pct}%
        </span>
      </div>

      <p className="text-sm font-semibold text-text-primary mb-2">
        {operationName}
      </p>

      {/* Progress bar */}
      <div className="mb-2 h-1.5 rounded-full bg-surface-overlay">
        <div
          className="h-full rounded-full bg-[#00D1FF] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step, i) => {
          const colors = STEP_COLORS[step.status];
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${colors.dot}`}
              >
                {step.status === "active" && (
                  <span className="block h-1.5 w-1.5 rounded-full bg-[#00D1FF] animate-ping" />
                )}
              </span>
              <span
                className={`text-[11px] ${colors.text} ${i === currentStep ? "font-semibold" : ""}`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
