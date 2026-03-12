"use client";

type GateStatus = "pending" | "passed" | "failed" | "overridden" | "expired";

interface GateAlertEmbedProps {
  gateName: string;
  vaultName: string;
  status: GateStatus;
  healthScore?: number;
  timeoutPercent?: number;
  blockers?: string[];
}

const STATUS_CONFIG: Record<
  GateStatus,
  { label: string; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    color: "text-accent-warning",
    bg: "bg-accent-warning/10",
  },
  passed: {
    label: "Passed",
    color: "text-accent-success",
    bg: "bg-accent-success/10",
  },
  failed: {
    label: "Failed",
    color: "text-accent-danger",
    bg: "bg-accent-danger/10",
  },
  overridden: {
    label: "Overridden",
    color: "text-[#A855F7]",
    bg: "bg-[#A855F7]/10",
  },
  expired: {
    label: "Expired",
    color: "text-text-muted",
    bg: "bg-surface-overlay",
  },
};

export default function GateAlertEmbed({
  gateName,
  vaultName,
  status,
  healthScore,
  timeoutPercent,
  blockers,
}: GateAlertEmbedProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Gate Alert
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.color} ${config.bg}`}
        >
          {config.label}
        </span>
      </div>

      <p className="text-sm font-semibold text-text-primary">{gateName}</p>
      <p className="text-[11px] text-text-muted">{vaultName}</p>

      {(healthScore !== undefined || timeoutPercent !== undefined) && (
        <div className="mt-2 flex gap-4">
          {healthScore !== undefined && (
            <div>
              <span className="text-[9px] text-text-muted">Health</span>
              <p
                className={`text-sm font-semibold ${healthScore >= 70 ? "text-accent-success" : healthScore >= 40 ? "text-accent-warning" : "text-accent-danger"}`}
              >
                {healthScore}/100
              </p>
            </div>
          )}
          {timeoutPercent !== undefined && (
            <div>
              <span className="text-[9px] text-text-muted">SLA</span>
              <div className="mt-0.5 h-1.5 w-16 rounded-full bg-surface-overlay">
                <div
                  className={`h-full rounded-full ${timeoutPercent >= 75 ? "bg-accent-danger" : "bg-accent-primary"}`}
                  style={{ width: `${Math.min(timeoutPercent, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {blockers && blockers.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {blockers.map((b, i) => (
            <p key={i} className="text-[11px] text-accent-danger">
              &bull; {b}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
