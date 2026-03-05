import TriptychLayout from "@/components/templates/TriptychLayout";

export default function VaultLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { vaultId: string };
}) {
  return (
    <TriptychLayout
      title={`Vault ${params.vaultId}`}
      breadcrumb="Contracts"
      vaultId={params.vaultId}
    >
      {children}
    </TriptychLayout>
  );
}
