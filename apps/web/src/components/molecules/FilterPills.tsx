"use client";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterPillsProps {
  filters: readonly FilterOption[] | FilterOption[];
  activeValue: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function FilterPills({
  filters,
  activeValue,
  onChange,
  className,
}: FilterPillsProps) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className ?? ""}`}>
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeValue === f.value
              ? "bg-accent-primary text-text-inverse"
              : "bg-surface-overlay text-text-secondary hover:bg-surface-border hover:text-text-primary"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
