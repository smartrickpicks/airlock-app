import type { FieldStatus } from "@/lib/mock-extractions";

const statusColorMap: Record<FieldStatus, string> = {
  pass: "bg-gate-green",
  review: "bg-gate-amber",
  fail: "bg-gate-red",
  missing: "bg-text-muted",
  suggested: "bg-accent-primary",
};

interface StatusDotProps {
  status: FieldStatus;
  className?: string;
}

export default function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${statusColorMap[status]} ${className ?? ""}`}
      aria-label={`${status} status`}
    />
  );
}
