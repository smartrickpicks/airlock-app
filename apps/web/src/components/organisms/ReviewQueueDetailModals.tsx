"use client";

import Modal from "@/components/molecules/Modal";
import type {
  ChildVault,
  FeedItem,
  HandoffSignal,
  HandoffSignalItem,
  ParentVaultCard,
} from "@/lib/mock-review-queue";

export function ReviewEntityModal({
  entity,
  child,
  isOpen,
  onClose,
}: {
  entity: ParentVaultCard | null;
  child: ChildVault | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!entity) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Entity Review Summary"
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {entity.name}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {entity.vaultCount} vaults across{" "}
            {entity.assignedBuilders.join(", ")}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Health" value={`${entity.healthScore}`} />
          <MetricCard
            label="Build Ready"
            value={`${entity.buildReadyPercent}%`}
          />
          <MetricCard label="Patches" value={`${entity.patches}`} />
          <MetricCard label="RFIs" value={`${entity.rfis}`} />
        </div>

        {child ? (
          <div className="rounded-lg border border-surface-border bg-surface-overlay p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Selected Child Vault
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MetricCard label="Counterparty" value={child.counterparty} />
              <MetricCard label="Builder" value={child.builder} />
              <MetricCard label="Gate" value={child.gateLabel} />
              <MetricCard label="Items" value={`${child.itemCount}`} />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function ReviewSignalModal({
  signal,
  item,
  isOpen,
  onClose,
}: {
  signal: HandoffSignal | null;
  item: HandoffSignalItem | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!signal) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Handoff Signal Detail"
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {signal.label}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">{signal.breakdown}</p>
        </div>

        {item ? (
          <div className="rounded-lg border border-surface-border bg-surface-overlay p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-medium text-text-primary">
                  {item.vaultName}
                </h4>
                <p className="mt-1 text-xs text-text-muted">
                  {item.entityTag} · {item.analyst}
                </p>
              </div>
              <span className="rounded-full bg-surface-raised px-2 py-1 text-[10px] font-medium text-text-secondary">
                Selected
              </span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              {item.description}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          {signal.items.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text-primary">
                  {entry.vaultName}
                </span>
                <span className="text-[10px] text-text-muted">
                  {relativeTime(entry.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {entry.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function ReviewFeedModal({
  item,
  isOpen,
  onClose,
}: {
  item: FeedItem | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activity Detail" size="md">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {item.title}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">{item.detail}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Vault" value={item.vaultName} />
          <MetricCard label="Entity" value={item.entityName} />
          <MetricCard label="Builder" value={item.builderName} />
          <MetricCard label="Type" value={item.eventType} />
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
