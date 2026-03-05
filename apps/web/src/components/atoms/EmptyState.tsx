import type { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  className?: string;
}

export default function EmptyState({
  message,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className ?? ""}`}
    >
      {icon && <div className="mb-3 text-text-muted">{icon}</div>}
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}
