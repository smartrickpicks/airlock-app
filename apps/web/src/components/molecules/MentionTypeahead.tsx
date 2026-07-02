"use client";

export interface MentionOption {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface MentionTypeaheadProps {
  query: string;
  options: MentionOption[];
  onSelect: (option: MentionOption) => void;
  onClose: () => void;
  activeIndex: number;
}

export default function MentionTypeahead({
  query,
  options,
  onSelect,
  activeIndex,
}: MentionTypeaheadProps) {
  if (options.length === 0 && query.length > 0) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-raised shadow-lg p-1 min-w-[200px]">
        <p className="px-2 py-1.5 text-xs text-text-muted">No matches</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised shadow-lg p-1 min-w-[200px]">
      <div className="max-h-[160px] overflow-hidden">
        {options.slice(0, 5).map((option, index) => (
          <button
            key={option.userId}
            type="button"
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${
              index === activeIndex
                ? "bg-surface-overlay"
                : "hover:bg-surface-hover"
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(option);
            }}
          >
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-semibold text-text-primary">
              {option.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-primary truncate">
                {option.name}
              </p>
              {option.email && (
                <p className="text-[10px] text-text-muted truncate">
                  {option.email}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
