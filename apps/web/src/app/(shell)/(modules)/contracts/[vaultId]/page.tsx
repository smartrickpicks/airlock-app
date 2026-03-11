"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import GateDot from "@/components/atoms/GateDot";
import RecordInspector from "@/components/organisms/RecordInspector";
import AuditTrailFullScreen from "@/components/organisms/AuditTrailFullScreen";
import { useVaultStore } from "@/stores/vault.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { CHAMBERS } from "@/lib/constants";
import type { Chamber } from "@/stores/vault.store";
import type { ChamberName } from "@/lib/constants";

export default function VaultDetailPage() {
  const params = useParams<{ vaultId: string }>();
  const { selectedVault, fetchVault, advanceChamber, isLoading } =
    useVaultStore();
  const [isAdvancing, setIsAdvancing] = useState(false);

  useEffect(() => {
    if (params.vaultId) {
      fetchVault(params.vaultId);
      // Mark "view_vault" checklist item as complete
      useOnboardingStore.getState().completeChecklistItem("view_vault");
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

  const currentChamber = (selectedVault.chamber as ChamberName) ?? "discover";
  const chamberOrder = CHAMBERS[currentChamber].order;
  const CHAMBER_KEYS: ChamberName[] = ["discover", "build", "review", "ship"];
  const nextChamber = chamberOrder < 3 ? CHAMBER_KEYS[chamberOrder + 1] : null;

  const handleAdvance = async () => {
    if (!params.vaultId || !nextChamber) return;
    setIsAdvancing(true);
    await advanceChamber(params.vaultId);
    setIsAdvancing(false);
  };

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
            {nextChamber && (
              <button
                onClick={handleAdvance}
                disabled={isAdvancing}
                className="flex items-center gap-1.5 rounded-md bg-accent-primary/15 px-3 py-1.5 text-xs font-semibold text-accent-primary transition-colors hover:bg-accent-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdvancing ? (
                  "Advancing..."
                ) : (
                  <>
                    <ChevronRight size={14} />
                    Advance to {CHAMBERS[nextChamber].label}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Record Inspector */}
      <div className="flex-1 overflow-hidden">
        <RecordInspector vaultId={selectedVault.id} />
      </div>

      <AuditTrailFullScreen />
    </div>
  );
}
