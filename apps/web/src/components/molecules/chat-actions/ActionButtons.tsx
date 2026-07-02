"use client";

interface ActionOption {
  id: string;
  label: string;
  variant?: "primary" | "danger" | "default";
}

interface ActionButtonsProps {
  actions: ActionOption[];
  onSelect: (actionId: string) => void;
  disabled?: boolean;
  selectedId?: string | null;
}

const VARIANT_STYLES: Record<string, string> = {
  primary: "border-[#00D1FF]/30 text-[#00D1FF] hover:bg-[#00D1FF]/10",
  danger:
    "border-accent-danger/30 text-accent-danger hover:bg-accent-danger/10",
  default:
    "border-surface-border text-text-secondary hover:text-text-primary hover:border-text-muted",
};

export default function ActionButtons({
  actions,
  onSelect,
  disabled,
  selectedId,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const isSelected = selectedId === action.id;
        const variant = action.variant || "default";
        return (
          <button
            key={action.id}
            onClick={() => onSelect(action.id)}
            disabled={disabled || isSelected}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              isSelected
                ? "border-[#00D1FF] bg-[#00D1FF]/15 text-[#00D1FF]"
                : VARIANT_STYLES[variant]
            } disabled:opacity-40`}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
