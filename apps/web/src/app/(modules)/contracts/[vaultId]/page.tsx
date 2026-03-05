export default function VaultDetailPage({
  params,
}: {
  params: { vaultId: string };
}) {
  return (
    <div className="p-6">
      <p className="text-text-secondary">
        Orchestrate — primary workspace for vault {params.vaultId}
      </p>
    </div>
  );
}
