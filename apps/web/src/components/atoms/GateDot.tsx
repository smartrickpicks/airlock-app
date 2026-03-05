type Gate = "discover" | "build" | "review" | "ship";

interface GateDotProps {
  gate: Gate;
  className?: string;
}

const gateColorMap: Record<Gate, string> = {
  discover: "bg-gate-red",
  build: "bg-gate-yellow",
  review: "bg-gate-purple",
  ship: "bg-gate-green",
};

export default function GateDot({ gate, className }: GateDotProps) {
  return (
    <span
      className={`
        inline-block w-2 h-2 rounded-full flex-shrink-0
        ${gateColorMap[gate]}
        ${className ?? ""}
      `}
      aria-label={`${gate} gate`}
    />
  );
}
