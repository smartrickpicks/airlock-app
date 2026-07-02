"use client";

interface DecfScore {
  label: string;
  value: number;
  target: number;
}

interface SovereignBalanceEmbedProps {
  scores: DecfScore[];
  teamSize: number;
  gapThreshold?: number;
}

const DRIVE_COLORS: Record<string, string> = {
  D: "#EF4444",
  E: "#F59E0B",
  C: "#6366F1",
  F: "#22C55E",
};

export default function SovereignBalanceEmbed({
  scores,
  teamSize,
  gapThreshold = 1.5,
}: SovereignBalanceEmbedProps) {
  const maxGap = Math.max(...scores.map((s) => Math.abs(s.value - s.target)));
  const isBalanced = maxGap <= gapThreshold;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Sovereign Balance
        </span>
        <span
          className={`text-[10px] font-semibold ${isBalanced ? "text-accent-success" : "text-accent-warning"}`}
        >
          {isBalanced ? "Balanced" : "Gap Detected"}
        </span>
      </div>

      <div className="space-y-2">
        {scores.map((s) => {
          const gap = Math.abs(s.value - s.target);
          const isGap = gap > gapThreshold;
          const pct = Math.min((s.value / 10) * 100, 100);
          const targetPct = Math.min((s.target / 10) * 100, 100);
          const color = DRIVE_COLORS[s.label] || "#64748B";

          return (
            <div key={s.label}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-text-primary">
                  {s.label}
                </span>
                <span
                  className={`font-mono ${isGap ? "text-accent-warning" : "text-text-muted"}`}
                >
                  {s.value.toFixed(1)} / {s.target.toFixed(1)}
                </span>
              </div>
              <div className="relative mt-0.5 h-1.5 rounded-full bg-surface-overlay">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-text-muted/50"
                  style={{ left: `${targetPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[9px] text-text-muted">
        {teamSize} members &middot; Max gap: {maxGap.toFixed(1)}
      </div>
    </div>
  );
}
