"use client";

import Modal from "@/components/molecules/Modal";
import type { VaultEvent } from "@/stores/event.store";

interface SignalEventModalProps {
  event: VaultEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SignalEventModal({
  event,
  isOpen,
  onClose,
}: SignalEventModalProps) {
  if (!event) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Signal Detail" size="md">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {event.event_type.replace(/_/g, " ")}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {typeof event.payload.vault_name === "string"
              ? event.payload.vault_name
              : "Workspace activity"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Vault ID" value={event.vault_id} />
          <MetricCard label="Actor" value={event.actor_id ?? "System"} />
          <MetricCard label="Workspace" value={event.workspace_id} />
          <MetricCard
            label="Occurred"
            value={new Date(event.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          />
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-overlay p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Payload
          </div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-text-secondary">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
