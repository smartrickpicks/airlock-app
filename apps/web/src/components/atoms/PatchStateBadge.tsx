import {
  STATE_LABELS,
  stateCategory,
  type PatchState,
} from "@/lib/mock-patches";

const categoryStyles: Record<string, string> = {
  active: "bg-accent-primary/20 text-accent-primary",
  success: "bg-gate-green/20 text-gate-green",
  danger: "bg-gate-red/20 text-gate-red",
  warning: "bg-gate-amber/20 text-gate-amber",
  neutral: "bg-text-muted/20 text-text-muted",
};

interface PatchStateBadgeProps {
  state: PatchState;
  className?: string;
}

export default function PatchStateBadge({
  state,
  className,
}: PatchStateBadgeProps) {
  const category = stateCategory(state);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryStyles[category]} ${className ?? ""}`}
    >
      {STATE_LABELS[state]}
    </span>
  );
}
