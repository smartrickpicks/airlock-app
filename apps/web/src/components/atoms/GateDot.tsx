type Gate = "discover" | "build" | "review" | "ship";

interface GateDotProps {
  gate: Gate;
  className?: string;
  /** Show glow ring — use for prominent displays, not dense lists */
  glow?: boolean;
}

const gateColorMap: Record<Gate, string> = {
  discover: "bg-gate-red",
  build: "bg-gate-yellow",
  review: "bg-gate-purple",
  ship: "bg-gate-green",
};

const gateGlowMap: Record<Gate, string> = {
  discover: "shadow-glow-discover",
  build: "shadow-glow-build",
  review: "shadow-glow-review",
  ship: "shadow-glow-ship",
};

export default function GateDot({ gate, glow, className }: GateDotProps) {
  return (
    <span
      className={`
        inline-block rounded-full flex-shrink-0
        ${gateColorMap[gate]}
        ${glow ? gateGlowMap[gate] : ""}
        ${className ?? "w-2 h-2"}
      `}
      aria-label={`${gate} gate`}
    />
  );
}
