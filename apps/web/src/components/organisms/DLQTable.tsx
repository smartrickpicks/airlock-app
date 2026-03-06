"use client";

import { useState } from "react";
import { RotateCcw, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { QueueName, DLQEntry } from "@/lib/mock-event-bus";

interface DLQTableProps {
  entries: DLQEntry[];
  selectedQueue: QueueName | null;
  onRetryJob: (entryId: string) => void;
  onRetryAll: (queueName: QueueName) => void;
  onPurgeDLQ: (queueName: QueueName) => void;
}

export default function DLQTable({
  entries,
  selectedQueue,
  onRetryJob,
  onRetryAll,
  onPurgeDLQ,
}: DLQTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "retry-all" | "purge";
    queue: QueueName;
  } | null>(null);

  const filtered = selectedQueue
    ? entries.filter((e) => e.queueName === selectedQueue)
    : entries;

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "retry-all") {
      onRetryAll(confirmAction.queue);
    } else {
      onPurgeDLQ(confirmAction.queue);
    }
    setConfirmAction(null);
  };

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-overlay p-8 text-center">
        <p className="text-sm text-text-muted">
          No dead letter queue entries
          {selectedQueue ? ` for ${selectedQueue}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            Dead Letter Queue
          </h3>
          <span className="rounded-full bg-accent-error/15 px-2 py-0.5 text-[10px] font-medium text-accent-error">
            {filtered.length}
          </span>
        </div>
        {selectedQueue && (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setConfirmAction({ type: "retry-all", queue: selectedQueue })
              }
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors"
            >
              <RotateCcw size={12} />
              Retry All
            </button>
            <button
              onClick={() =>
                setConfirmAction({ type: "purge", queue: selectedQueue })
              }
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-accent-error hover:bg-accent-error/10 transition-colors"
            >
              <Trash2 size={12} />
              Purge
            </button>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="flex items-center justify-between border-b border-accent-warning/30 bg-accent-warning/10 px-4 py-2">
          <p className="text-xs text-accent-warning">
            {confirmAction.type === "retry-all"
              ? `Retry all DLQ jobs for ${confirmAction.queue}?`
              : `Permanently purge all DLQ jobs for ${confirmAction.queue}?`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirm}
              className="rounded bg-accent-warning/20 px-2 py-0.5 text-[11px] font-medium text-accent-warning hover:bg-accent-warning/30"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="rounded px-2 py-0.5 text-[11px] text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border text-[11px] font-medium uppercase tracking-wider text-text-muted">
              <th className="w-8 px-4 py-2" />
              <th className="px-3 py-2">Queue</th>
              <th className="px-3 py-2">Event Type</th>
              <th className="px-3 py-2">Source Vault</th>
              <th className="px-3 py-2">Error</th>
              <th className="px-3 py-2">Retries</th>
              <th className="px-3 py-2">Failed</th>
              <th className="w-16 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <DLQRow
                  key={entry.id}
                  entry={entry}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : entry.id)}
                  onRetry={() => onRetryJob(entry.id)}
                  timeAgo={timeAgo}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DLQRow({
  entry,
  isExpanded,
  onToggle,
  onRetry,
  timeAgo,
}: {
  entry: DLQEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  timeAgo: (iso: string) => string;
}) {
  return (
    <>
      <tr className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
        <td className="px-4 py-2">
          <button
            onClick={onToggle}
            className="text-text-muted hover:text-text-primary"
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        </td>
        <td className="px-3 py-2 text-xs text-text-secondary">
          {entry.queueName}
        </td>
        <td className="px-3 py-2">
          <span className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[11px] text-text-primary">
            {entry.eventType}
          </span>
        </td>
        <td className="px-3 py-2 font-mono text-[11px] text-accent-primary">
          {entry.sourceVaultId}
        </td>
        <td className="max-w-[200px] truncate px-3 py-2 text-xs text-accent-error">
          {entry.errorMessage}
        </td>
        <td className="px-3 py-2 text-center text-xs text-text-muted">
          {entry.retryCount}/3
        </td>
        <td className="px-3 py-2 text-xs text-text-muted">
          {timeAgo(entry.failedAt)}
        </td>
        <td className="px-3 py-2">
          <button
            onClick={onRetry}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-accent-primary hover:bg-accent-primary/10 transition-colors"
            title="Retry this job"
          >
            <RotateCcw size={12} />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-surface-border/50 bg-surface-sunken">
          <td colSpan={8} className="px-8 py-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Payload Preview
            </p>
            <pre className="whitespace-pre-wrap break-all rounded bg-surface-overlay p-2 font-mono text-[11px] text-text-secondary">
              {entry.payloadPreview}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
