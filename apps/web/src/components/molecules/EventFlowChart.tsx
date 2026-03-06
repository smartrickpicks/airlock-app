"use client";

import { useState } from "react";
import type { EventFlowPoint } from "@/lib/mock-event-bus";

interface EventFlowChartProps {
  data: EventFlowPoint[];
  height?: number;
}

export default function EventFlowChart({
  data,
  height = 120,
}: EventFlowChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.processed + d.failed), 1);
  const currentRate = data[data.length - 1]?.processed ?? 0;

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-text-muted">
          Events / min (last 30 min)
        </p>
        <p className="text-sm font-semibold text-text-primary">
          {currentRate}
          <span className="ml-1 text-[10px] font-normal text-text-muted">
            /min
          </span>
        </p>
      </div>

      {/* Chart */}
      <div
        className="relative flex items-end gap-px"
        style={{ height }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {data.map((point, i) => {
          const total = point.processed + point.failed;
          const totalHeight = (total / maxValue) * 100;
          const failedHeight =
            total > 0 ? (point.failed / total) * totalHeight : 0;
          const processedHeight = totalHeight - failedHeight;
          const isHovered = hoveredIndex === i;

          return (
            <div
              key={i}
              className="relative flex flex-1 flex-col justify-end"
              style={{ height: "100%" }}
              onMouseEnter={() => setHoveredIndex(i)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-surface-sunken px-2 py-1 text-[10px] shadow-lg border border-surface-border">
                  <p className="text-text-primary">
                    {formatTime(point.timestamp)}
                  </p>
                  <p className="text-accent-primary">
                    {point.processed} processed
                  </p>
                  {point.failed > 0 && (
                    <p className="text-accent-error">{point.failed} failed</p>
                  )}
                </div>
              )}

              {/* Bar */}
              <div
                className={`w-full rounded-t-sm transition-opacity ${
                  isHovered ? "opacity-100" : "opacity-80"
                }`}
              >
                {point.failed > 0 && (
                  <div
                    className="w-full bg-accent-error/60 rounded-t-sm"
                    style={{ height: `${failedHeight}%` }}
                  />
                )}
                <div
                  className="w-full bg-accent-primary/60"
                  style={{
                    height: `${processedHeight}%`,
                    borderRadius: point.failed > 0 ? "0" : "2px 2px 0 0",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="mt-1 flex justify-between text-[9px] text-text-muted">
        {data.length > 0 && <span>{formatTime(data[0].timestamp)}</span>}
        {data.length > 14 && (
          <span>{formatTime(data[Math.floor(data.length / 2)].timestamp)}</span>
        )}
        {data.length > 1 && (
          <span>{formatTime(data[data.length - 1].timestamp)}</span>
        )}
      </div>
    </div>
  );
}
