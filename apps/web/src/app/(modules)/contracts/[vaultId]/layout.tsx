export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Triptych: Signal | Orchestrate | Control */}
      {children}
    </div>
  );
}
