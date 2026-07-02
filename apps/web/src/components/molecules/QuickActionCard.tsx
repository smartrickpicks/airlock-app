"use client";

interface QuickActionCardProps {
  id: string;
  title: string;
  description: string;
  tag: "Instant" | "Guided";
  onSelect: (actionId: string) => void;
}

export default function QuickActionCard({
  id,
  title,
  description,
  tag,
  onSelect,
}: QuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="w-full rounded-lg border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:border-accent-primary hover:bg-surface-hover"
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            tag === "Instant"
              ? "bg-green-500/10 text-green-400"
              : "bg-blue-500/10 text-blue-400"
          }`}
        >
          {tag}
        </span>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
    </button>
  );
}
