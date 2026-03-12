"use client";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
}

interface PlaybookDiffEmbedProps {
  title: string;
  versionBefore: string;
  versionAfter: string;
  changes: DiffLine[];
  changeCount: number;
}

const DIFF_STYLES: Record<
  string,
  { bg: string; prefix: string; text: string }
> = {
  added: {
    bg: "bg-accent-success/10",
    prefix: "+",
    text: "text-accent-success",
  },
  removed: {
    bg: "bg-accent-danger/10",
    prefix: "-",
    text: "text-accent-danger",
  },
  unchanged: { bg: "", prefix: " ", text: "text-text-muted" },
};

export default function PlaybookDiffEmbed({
  title,
  versionBefore,
  versionAfter,
  changes,
  changeCount,
}: PlaybookDiffEmbedProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Playbook Diff
        </span>
        <span className="text-[10px] text-accent-warning font-semibold">
          {changeCount} change{changeCount !== 1 ? "s" : ""}
        </span>
      </div>

      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="text-[11px] text-text-muted">
        {versionBefore} → {versionAfter}
      </p>

      <div className="mt-2 rounded border border-surface-border bg-surface-sunken p-2 font-mono text-[11px] max-h-32 overflow-y-auto">
        {changes.map((line, i) => {
          const style = DIFF_STYLES[line.type];
          return (
            <div key={i} className={`${style.bg} px-1`}>
              <span className={style.text}>
                {style.prefix} {line.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
