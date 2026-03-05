"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import GateDot from "@/components/atoms/GateDot";
import RecordInspector from "@/components/organisms/RecordInspector";
import { useVaultStore } from "@/stores/vault.store";
import type { Chamber } from "@/stores/vault.store";

export default function VaultDetailPage() {
  const params = useParams<{ vaultId: string }>();
  const { selectedVault, fetchVault, isLoading } = useVaultStore();

  useEffect(() => {
    if (params.vaultId) {
      fetchVault(params.vaultId);
    }
  }, [params.vaultId, fetchVault]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">Loading vault...</p>
      </div>
    );
  }

  if (!selectedVault) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">Vault not found</p>
      </div>
    );
  }

  const entity =
    (selectedVault.metadata as Record<string, string>).entity || "";
  const contractType =
    (selectedVault.metadata as Record<string, string>).contract_type || "";
  const healthColor =
    (selectedVault.health_score ?? 0) >= 80
      ? "text-gate-green"
      : (selectedVault.health_score ?? 0) >= 50
        ? "text-gate-yellow"
        : "text-gate-red";

  return (
    <div className="flex h-full flex-col">
      {/* Compact vault header */}
      <div className="flex-shrink-0 border-b border-surface-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GateDot
              gate={(selectedVault.chamber as Chamber) || "discover"}
              className="h-3 w-3"
            />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {selectedVault.name}
              </h2>
              <p className="text-xs text-text-muted">
                {entity}
                {contractType ? ` — ${contractType}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs capitalize text-text-secondary">
              {selectedVault.chamber || "—"}
            </span>
            <span className="text-xs text-text-muted">
              {selectedVault.vault_type}
            </span>
            <span className={`font-mono text-sm font-bold ${healthColor}`}>
              {selectedVault.health_score ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Record Inspector */}
      <div className="flex-1 overflow-hidden">
        <RecordInspector vaultId={selectedVault.id} />
      </div>
    </div>
  );
}
