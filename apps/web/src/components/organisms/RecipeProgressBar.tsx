"use client";

interface RecipeNode {
  type: string;
  description: string;
}

interface RecipeProgressBarProps {
  nodes: RecipeNode[];
  currentIndex: number;
}

export default function RecipeProgressBar({
  nodes,
  currentIndex,
}: RecipeProgressBarProps) {
  return (
    <div className="space-y-1 rounded-lg border border-surface-border bg-surface-raised p-3">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-muted">
        Recipe Progress
      </h3>
      {nodes.map((node, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                isComplete
                  ? "bg-accent-success text-white"
                  : isCurrent
                    ? "border-2 border-accent-primary bg-accent-primary/15 text-accent-primary"
                    : "border border-surface-border text-text-muted"
              }`}
            >
              {isComplete ? "\u2713" : isCurrent ? "\u25CF" : ""}
            </span>
            <span
              className={`text-xs ${
                isCurrent ? "font-medium text-text-primary" : "text-text-muted"
              }`}
            >
              {node.description || node.type}
              {isCurrent && (
                <span className="ml-1 text-[10px] text-accent-primary">
                  current
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
