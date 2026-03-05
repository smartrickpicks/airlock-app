import TriptychLayout from "@/components/templates/TriptychLayout";

export default async function VaultLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ vaultId: string }>;
}) {
  const { vaultId } = await params;

  return (
    <TriptychLayout title={vaultId} breadcrumb="Contracts" vaultId={vaultId}>
      {children}
    </TriptychLayout>
  );
}
