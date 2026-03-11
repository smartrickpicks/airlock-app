"use client";

/**
 * Skeleton loader with shimmer animation.
 * Replaces "Loading..." text across the app.
 *
 * Usage:
 *   <Skeleton className="h-4 w-32" />           // text line
 *   <Skeleton className="h-10 w-full" />         // full-width bar
 *   <Skeleton variant="circle" className="h-8 w-8" />  // avatar
 *   <Skeleton variant="card" />                  // card placeholder
 */

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circle" | "card";
}

export default function Skeleton({
  className = "",
  variant = "text",
}: SkeletonProps) {
  const baseStyles = "relative overflow-hidden bg-surface-border/50";

  const variantStyles = {
    text: "rounded-md h-4",
    circle: "rounded-full",
    card: "rounded-lg h-24 w-full",
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 animate-airlock-shimmer"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
        }}
      />
    </div>
  );
}

/* ─── Preset compositions ──────────────────────────────────────────────────── */

/** Skeleton for a list of text lines */
export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === count - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Skeleton for a card in a grid */
export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

/** Skeleton for a row in a table/list */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-border/50 bg-surface-raised px-4 py-3">
      <Skeleton variant="circle" className="h-8 w-8" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}
