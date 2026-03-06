interface SkeletonProps {
  className?: string;
  /** lines = stacked text rows, block = single rectangle, avatar = circle */
  variant?: "lines" | "block" | "avatar";
  rows?: number;
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-surface-overlay ${className ?? ""}`}>
      {/* Shimmer sweep */}
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

export default function Skeleton({ className, variant = "lines", rows = 3 }: SkeletonProps) {
  if (variant === "avatar") {
    return (
      <div className={`relative overflow-hidden rounded-full bg-surface-overlay ${className ?? "w-9 h-9"}`}>
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      </div>
    );
  }

  if (variant === "block") {
    return <SkeletonBar className={className ?? "h-20 w-full"} />;
  }

  // lines variant
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar
          key={i}
          className={`h-3 ${i === rows - 1 ? "w-3/5" : "w-full"}`}
        />
      ))}
    </div>
  );
}
