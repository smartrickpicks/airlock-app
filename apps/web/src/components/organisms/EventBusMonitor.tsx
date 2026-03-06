"use client";

import { useState } from "react";
import {
  Zap,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useEventBusStore } from "@/stores/event-bus.store";
import { EVENT_ROUTES } from "@/lib/mock-event-bus";
import QueueHealthCard from "@/components/molecules/QueueHealthCard";
import EventFlowChart from "@/components/molecules/EventFlowChart";
import DLQTable from "@/components/organisms/DLQTable";

export default function EventBusMonitor() {
  const {
    queueStats,
    dlqEntries,
    eventFlow,
    selectedQueue,
    selectQueue,
    retryDLQJob,
    retryAllDLQ,
    purgeDLQ,
    queueHealth,
    totalEventsPerSecond,
  } = useEventBusStore();

  const [showRoutes, setShowRoutes] = useState(false);

  const totalDLQ = queueStats.reduce((sum, q) => sum + q.dlqSize, 0);
  const maxAvgMs = Math.max(...queueStats.map((q) => q.avgDurationMs), 0);
  const eventsPerSec = totalEventsPerSecond();

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        <SummaryChip
          icon={<Zap size={14} />}
          label="Throughput"
          value={`${eventsPerSec} events/sec`}
          color="text-accent-primary"
        />
        <SummaryChip
          icon={<Clock size={14} />}
          label="Max Avg Latency"
          value={`${maxAvgMs}ms`}
          color="text-text-primary"
        />
        <SummaryChip
          icon={<AlertTriangle size={14} />}
          label="DLQ Depth"
          value={String(totalDLQ)}
          color={totalDLQ > 0 ? "text-accent-error" : "text-accent-success"}
        />
      </div>

      {/* Queue health grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            Queue Health
          </h3>
          {selectedQueue && (
            <button
              onClick={() => selectQueue(null)}
              className="text-[11px] text-accent-primary hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {queueStats.map((stats) => (
            <QueueHealthCard
              key={stats.name}
              stats={stats}
              health={queueHealth(stats)}
              isSelected={selectedQueue === stats.name}
              onClick={() =>
                selectQueue(selectedQueue === stats.name ? null : stats.name)
              }
            />
          ))}
        </div>
      </div>

      {/* Event flow */}
      <EventFlowChart data={eventFlow} />

      {/* DLQ */}
      <DLQTable
        entries={dlqEntries}
        selectedQueue={selectedQueue}
        onRetryJob={retryDLQJob}
        onRetryAll={retryAllDLQ}
        onPurgeDLQ={purgeDLQ}
      />

      {/* Event routes (collapsible) */}
      <div className="rounded-lg border border-surface-border bg-surface-overlay">
        <button
          onClick={() => setShowRoutes(!showRoutes)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <h3 className="text-sm font-semibold text-text-primary">
            Event Routing Table
          </h3>
          {showRoutes ? (
            <ChevronDown size={16} className="text-text-muted" />
          ) : (
            <ChevronRight size={16} className="text-text-muted" />
          )}
        </button>
        {showRoutes && (
          <div className="border-t border-surface-border overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2">Event Type</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Target Queues</th>
                </tr>
              </thead>
              <tbody>
                {EVENT_ROUTES.map((route) => (
                  <tr
                    key={route.eventType}
                    className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-4 py-2">
                      <span className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[11px] text-text-primary">
                        {route.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-text-secondary">
                      {route.sourceModule}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {route.targetQueues.map((q) => (
                          <span
                            key={q}
                            className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryChip({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-2">
      <span className="text-text-muted">{icon}</span>
      <div>
        <p className="text-[10px] text-text-muted">{label}</p>
        <p className={`text-sm font-semibold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
