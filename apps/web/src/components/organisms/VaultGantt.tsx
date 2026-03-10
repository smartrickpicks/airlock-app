"use client";

import { useEffect, useRef } from "react";

interface VaultForGantt {
  id: string;
  name: string;
  slug: string;
  chamber: string | null;
  created_at: string;
  updated_at: string;
  health_score?: number | null;
}

interface VaultGanttProps {
  vaults: VaultForGantt[];
  onVaultClick?: (slug: string) => void;
}

const CHAMBER_COLORS: Record<string, string> = {
  discover: "#ef4444",
  build: "#eab308",
  review: "#a855f7",
  ship: "#22c55e",
};

export default function VaultGantt({ vaults, onVaultClick }: VaultGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || vaults.length === 0) return;

    const ganttTasks = vaults.map((v) => ({
      id: v.id,
      name: v.name.length > 35 ? v.name.slice(0, 32) + "..." : v.name,
      start: v.created_at.split("T")[0],
      end: v.updated_at.split("T")[0],
      progress: v.health_score ?? 0,
    }));

    import("frappe-gantt").then(({ default: Gantt }) => {
      container.innerHTML = "";

      const svgEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      container.appendChild(svgEl);

      try {
        new Gantt(svgEl, ganttTasks, {
          view_mode: "Month",
          date_format: "YYYY-MM-DD",
          language: "en",
          on_click: (task: { id: string }) => {
            const vault = vaults.find((v) => v.id === task.id);
            if (vault) onVaultClick?.(vault.slug);
          },
        });
      } catch (e) {
        console.warn("VaultGantt render error:", e);
      }
    });

    return () => {
      container.innerHTML = "";
    };
  }, [vaults, onVaultClick]);

  if (vaults.length === 0) return null;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4 overflow-x-auto">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          Vault Lifecycle Timeline
        </span>
        <div className="flex items-center gap-3">
          {Object.entries(CHAMBER_COLORS).map(([chamber, color]) => (
            <div key={chamber} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] capitalize text-text-muted">
                {chamber}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
