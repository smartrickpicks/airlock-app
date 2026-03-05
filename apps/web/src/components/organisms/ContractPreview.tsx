"use client";

import { useGeneratorStore } from "@/stores/generator.store";

export default function ContractPreview() {
  const { preview, template } = useGeneratorStore();

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">
          Select a contract type to begin.
        </p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">Building preview...</p>
      </div>
    );
  }

  // Parse the preview markdown into styled segments
  const lines = preview.split("\n");

  return (
    <div className="flex flex-col h-full">
      {/* Preview header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Preview
        </span>
        <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
          {template.display_name}
        </span>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          {lines.map((line, i) => {
            // H1
            if (line.startsWith("# ")) {
              return (
                <h1
                  key={i}
                  className="mb-6 text-center text-lg font-bold uppercase tracking-wide text-text-primary"
                >
                  {line.slice(2)}
                </h1>
              );
            }
            // H2
            if (line.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="mb-3 mt-6 border-b border-surface-border pb-1 text-sm font-bold uppercase tracking-wider text-text-primary"
                >
                  {line.slice(3)}
                </h2>
              );
            }
            // Clause ID reference (italic)
            if (line.startsWith("*Clause:")) {
              return (
                <p
                  key={i}
                  className="mb-4 font-mono text-[10px] text-text-muted"
                >
                  {line.replace(/\*/g, "")}
                </p>
              );
            }
            // Empty line
            if (line.trim() === "") {
              return <div key={i} className="h-2" />;
            }
            // Regular text — highlight [TO_BE_DEFINED] placeholders
            return (
              <p
                key={i}
                className="mb-2 text-sm leading-relaxed text-text-secondary"
              >
                {line.split(/(\[TO_BE_DEFINED\])/).map((segment, j) =>
                  segment === "[TO_BE_DEFINED]" ? (
                    <span
                      key={j}
                      className="rounded bg-gate-amber/20 px-1 py-0.5 font-mono text-xs text-gate-amber"
                    >
                      [TO_BE_DEFINED]
                    </span>
                  ) : (
                    <span key={j}>{segment}</span>
                  ),
                )}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
