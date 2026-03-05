"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import GateDot from "@/components/atoms/GateDot";
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
    <div className="p-6">
      {/* Vault header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <GateDot
              gate={(selectedVault.chamber as Chamber) || "discover"}
              className="h-3 w-3"
            />
            <h2 className="text-lg font-semibold text-text-primary">
              {selectedVault.name}
            </h2>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {entity}
            {contractType ? ` — ${contractType}` : ""}
          </p>
        </div>
        <div className="text-right">
          <span className={`font-mono text-lg font-bold ${healthColor}`}>
            {selectedVault.health_score ?? 0}%
          </span>
          <p className="text-xs text-text-muted">Health Score</p>
        </div>
      </div>

      {/* Status bar */}
      <div className="mb-6 flex gap-4 rounded-lg border border-surface-border bg-surface-overlay p-4">
        <div>
          <p className="text-xs text-text-muted">Chamber</p>
          <p className="text-sm font-medium capitalize text-text-primary">
            {selectedVault.chamber || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Gate</p>
          <p className="text-sm font-medium text-text-primary">
            {selectedVault.gate?.replace("gate_", "") || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Type</p>
          <p className="text-sm font-medium capitalize text-text-primary">
            {selectedVault.vault_type}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Slug</p>
          <p className="font-mono text-sm text-text-secondary">
            {selectedVault.slug}
          </p>
        </div>
      </div>

      {/* Metadata */}
      {Object.keys(selectedVault.metadata).length > 0 && (
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-sm font-medium text-text-secondary">
            Metadata
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(selectedVault.metadata).map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-text-muted">
                  {key.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-text-primary">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
