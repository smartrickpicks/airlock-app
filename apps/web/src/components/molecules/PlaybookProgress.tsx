import ProgressBar from "@/components/atoms/ProgressBar";
import type { DAGProgress } from "@/lib/mock-playbook-dag";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PlaybookProgressProps {
  templateName: string;
  progress: DAGProgress;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PlaybookProgress({
  templateName,
  progress,
  className,
}: PlaybookProgressProps) {
  const color =
    progress.percent < 33
      ? "danger"
      : progress.percent < 66
        ? "warning"
        : "success";

  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <p className="text-sm font-semibold text-text-primary">{templateName}</p>

      <ProgressBar value={progress.percent} color={color} showLabel />

      <p className="text-xs text-text-muted">
        {progress.completed} completed
        {progress.blocked > 0 && (
          <>
            {" \u2022 "}
            <span className="text-accent-warning">
              {progress.blocked} blocked
            </span>
          </>
        )}
        {progress.inProgress > 0 && (
          <>
            {" \u2022 "}
            <span className="text-accent-primary">
              {progress.inProgress} in progress
            </span>
          </>
        )}
        {progress.pending > 0 && (
          <>
            {" "}
            {"\u2022"} {progress.pending} pending
          </>
        )}
      </p>
    </div>
  );
}
