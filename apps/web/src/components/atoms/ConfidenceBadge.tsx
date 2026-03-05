import type { ConfidenceTier } from "@/lib/mock-extractions";

const tierStyles: Record<ConfidenceTier, string> = {
  HIGH: "bg-gate-green/20 text-gate-green",
  MED: "bg-gate-amber/20 text-gate-amber",
  LOW: "bg-gate-red/20 text-gate-red",
};

interface ConfidenceBadgeProps {
  tier: ConfidenceTier;
  className?: string;
}

export default function ConfidenceBadge({
  tier,
  className,
}: ConfidenceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${tierStyles[tier]} ${className ?? ""}`}
    >
      {tier}
    </span>
  );
}
