export default function VaultDetailPage({
  params,
}: {
  params: { vaultId: string };
}) {
  return (
    <>
      {/* Signal panel (left) */}
      <aside
        className="flex-shrink-0 border-r border-surface-border overflow-y-auto bg-surface-raised"
        style={{ width: "var(--triptych-signal-width)" }}
      >
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            Signal
          </h2>
          <p className="text-sm text-text-secondary">Event feed</p>
        </div>
      </aside>

      {/* Orchestrate panel (center) */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-1">Vault {params.vaultId}</h1>
          <p className="text-text-secondary">Orchestrate — primary workspace</p>
        </div>
      </main>

      {/* Control panel (right) */}
      <aside
        className="flex-shrink-0 border-l border-surface-border overflow-y-auto bg-surface-raised"
        style={{ width: "var(--triptych-control-width)" }}
      >
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            Control
          </h2>
          <p className="text-sm text-text-secondary">Vault metadata</p>
        </div>
      </aside>
    </>
  );
}
