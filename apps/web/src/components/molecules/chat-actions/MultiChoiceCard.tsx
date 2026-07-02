"use client";

interface ChoiceOption {
  id: string;
  title: string;
  description: string;
}

interface MultiChoiceCardProps {
  options: ChoiceOption[];
  onSelect: (optionId: string) => void;
  selectedId?: string | null;
}

export default function MultiChoiceCard({
  options,
  onSelect,
  selectedId,
}: MultiChoiceCardProps) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            disabled={!!selectedId}
            className={`w-full rounded-lg border p-3 text-left transition-colors ${
              isSelected
                ? "border-[#00D1FF] bg-[#00D1FF]/10"
                : "border-surface-border bg-surface-raised hover:border-text-muted"
            } disabled:opacity-60`}
          >
            <p className="text-sm font-semibold text-text-primary">
              {opt.title}
            </p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {opt.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
