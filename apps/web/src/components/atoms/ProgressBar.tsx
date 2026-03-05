type ProgressColor = "primary" | "success" | "warning" | "danger";

interface ProgressBarProps {
  value: number;
  color?: ProgressColor;
  showLabel?: boolean;
  className?: string;
}

const COLOR_CLASSES: Record<ProgressColor, string> = {
  primary: "bg-accent-primary",
  success: "bg-accent-success",
  warning: "bg-accent-warning",
  danger: "bg-accent-danger",
};

export default function ProgressBar({
  value,
  color = "primary",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className="h-1 flex-1 rounded-full bg-surface-overlay overflow-hidden">
        <div
          className={`h-full rounded-full ${COLOR_CLASSES[color]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-text-muted">{clamped}%</span>
      )}
    </div>
  );
}
