export default function ModulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Module sidebar — Active Vaults list */}
      <aside
        className="flex-shrink-0 bg-surface-raised border-r border-surface-border overflow-y-auto"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            Active Vaults
          </h2>
          <p className="text-sm text-text-secondary">No vaults yet</p>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </>
  );
}
