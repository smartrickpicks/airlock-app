"use client";

import { type ReactNode, useCallback } from "react";
import { useTriptychStore } from "@/stores/triptych.store";
import { usePatchStore } from "@/stores/patch.store";
import { useResizable } from "@/hooks/useResizable";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import SignalPanel from "@/components/organisms/SignalPanel";
import OrchestratePanel from "@/components/organisms/OrchestratePanel";
import ControlPanel from "@/components/organisms/ControlPanel";
import ResizeHandle from "@/components/atoms/ResizeHandle";
import GovernanceBar from "@/components/molecules/GovernanceBar";

/** Width used for collapsed (icon-only) side panels */
const COLLAPSED_WIDTH = 80;

interface TriptychLayoutProps {
  /** Content rendered inside the Orchestrate (center) panel */
  children: ReactNode;
  /** Title shown in the Orchestrate header */
  title?: string;
  /** Breadcrumb text shown before the title */
  breadcrumb?: string;
  /** Vault ID used for display/navigation */
  vaultId?: string;
}

/**
 * TriptychLayout — Three-panel workspace engine.
 *
 * Manages 4 view states:
 *   Standard        — Signal:280 | Orchestrate:flex-1 | Control:300
 *   Artifact Focus  — collapsed sides, Orchestrate ~90%
 *   Action Focus    — collapsed Signal, Orchestrate + Control expanded
 *   Gate Lock       — Standard + Governance bar, Control auto-selects Approvals
 *
 * Keyboard shortcuts are attached via useKeyboardShortcuts hook.
 * Panels are resizable via drag handles (useResizable hook).
 */
export default function TriptychLayout({
  children,
  title = "",
  breadcrumb = "",
  vaultId,
}: TriptychLayoutProps) {
  // Triptych state
  const {
    signalVisible,
    controlVisible,
    signalWidth,
    controlWidth,
    viewState,
    signalOverlayOpen,
    controlOverlayOpen,
    activeControlTab,
    setSignalWidth,
    setControlWidth,
    openSignalOverlay,
    closeSignalOverlay,
    openControlOverlay,
    closeControlOverlay,
    setActiveControlTab,
  } = useTriptychStore();

  // Activate keyboard shortcuts (Cmd+1/2/3/4, Escape)
  useKeyboardShortcuts();

  // Signal panel resize handle
  const { onDragStart: onSignalDragStart } = useResizable({
    currentWidth: signalWidth,
    minWidth: 200,
    maxWidth: 480,
    direction: "right",
    onResize: setSignalWidth,
  });

  // Control panel resize handle
  const { onDragStart: onControlDragStart } = useResizable({
    currentWidth: controlWidth,
    minWidth: 200,
    maxWidth: 480,
    direction: "left",
    onResize: setControlWidth,
  });

  // Patch store for governance bar actions
  const { selectedPatch, transitionPatch } = usePatchStore();

  const handleGovAction = useCallback(
    (targetState: string) => {
      if (!selectedPatch || !vaultId) return;
      transitionPatch(
        vaultId,
        selectedPatch.id,
        targetState,
        selectedPatch.version,
      );
    },
    [selectedPatch, vaultId, transitionPatch],
  );

  // Determine whether we're in Artifact Focus (amber glow on Orchestrate)
  const isArtifactFocus = viewState === "artifact-focus";
  const isGateLock = viewState === "gate-lock";

  // SLA time remaining for governance bar
  const slaTime = (() => {
    if (!selectedPatch?.sla_deadline) return "—";
    const remaining =
      new Date(selectedPatch.sla_deadline).getTime() - Date.now();
    if (remaining <= 0) return "OVERDUE";
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  })();

  const slaUrgency = (() => {
    if (!selectedPatch?.sla_deadline) return "green" as const;
    const remaining =
      new Date(selectedPatch.sla_deadline).getTime() - Date.now();
    if (remaining <= 0) return "red" as const;
    if (remaining < 4 * 3600000) return "amber" as const;
    return "green" as const;
  })();

  // Governance bar for Gate Lock mode — wired to patch actions
  const governanceBar = isGateLock ? (
    <GovernanceBar
      gateLabel="GATE REVIEW REQUIRED"
      slaTimeRemaining={slaTime}
      slaUrgency={slaUrgency}
      onApprove={
        selectedPatch ? () => handleGovAction("verifier_approved") : undefined
      }
      onReject={selectedPatch ? () => handleGovAction("rejected") : undefined}
      onClarify={
        selectedPatch ? () => handleGovAction("needs_clarification") : undefined
      }
      onHold={selectedPatch ? () => handleGovAction("admin_hold") : undefined}
    />
  ) : null;

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* === Signal Panel (left) === */}
      <div
        className="transition-all flex-shrink-0"
        style={{
          width: signalVisible ? signalWidth : COLLAPSED_WIDTH,
          transitionDuration: "300ms",
          transitionTimingFunction: "ease-in-out",
        }}
      >
        <SignalPanel
          width={signalVisible ? signalWidth : COLLAPSED_WIDTH}
          collapsed={!signalVisible}
          onOverlayToggle={() => {
            if (signalOverlayOpen) {
              closeSignalOverlay();
            } else {
              openSignalOverlay();
            }
          }}
          vaultId={vaultId}
        />
      </div>

      {/* Signal overlay — floating panel when collapsed and clicked */}
      {!signalVisible && signalOverlayOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-overlay"
            onClick={closeSignalOverlay}
          />
          {/* Overlay panel */}
          <div
            className="absolute top-0 bottom-0 z-overlay bg-surface-raised border-r border-surface-border shadow-xl"
            style={{
              left: COLLAPSED_WIDTH,
              width: signalWidth,
            }}
          >
            <SignalPanel
              width={signalWidth}
              collapsed={false}
              onOverlayToggle={closeSignalOverlay}
              vaultId={vaultId}
            />
          </div>
        </>
      )}

      {/* Signal resize handle (only when expanded) */}
      {signalVisible && <ResizeHandle onDragStart={onSignalDragStart} />}

      {/* === Orchestrate Panel (center) === */}
      <div
        className={`flex-1 min-w-[400px] overflow-hidden transition-all ${
          isArtifactFocus
            ? "ring-1 ring-gate-amber/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
            : ""
        }`}
        style={{
          transitionDuration: "300ms",
          transitionTimingFunction: "ease-in-out",
        }}
      >
        <OrchestratePanel
          title={title}
          breadcrumb={breadcrumb}
          governanceBar={governanceBar}
        >
          {children}
        </OrchestratePanel>
      </div>

      {/* Control resize handle (only when expanded) */}
      {controlVisible && <ResizeHandle onDragStart={onControlDragStart} />}

      {/* === Control Panel (right) === */}
      <div
        className="transition-all flex-shrink-0"
        style={{
          width: controlVisible ? controlWidth : COLLAPSED_WIDTH,
          transitionDuration: "300ms",
          transitionTimingFunction: "ease-in-out",
        }}
      >
        <ControlPanel
          width={controlVisible ? controlWidth : COLLAPSED_WIDTH}
          collapsed={!controlVisible}
          onOverlayToggle={() => {
            if (controlOverlayOpen) {
              closeControlOverlay();
            } else {
              openControlOverlay();
            }
          }}
          activeTab={activeControlTab}
          onTabChange={(tab) =>
            setActiveControlTab(
              tab as "lifecycle" | "sla" | "approvals" | "audit" | "ai-agent",
            )
          }
          vaultId={vaultId}
        />
      </div>

      {/* Control overlay — floating panel when collapsed and clicked */}
      {!controlVisible && controlOverlayOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-overlay"
            onClick={closeControlOverlay}
          />
          {/* Overlay panel */}
          <div
            className="absolute top-0 bottom-0 right-0 z-overlay bg-surface-raised border-l border-surface-border shadow-xl"
            style={{
              right: COLLAPSED_WIDTH,
              width: controlWidth,
            }}
          >
            <ControlPanel
              width={controlWidth}
              collapsed={false}
              onOverlayToggle={closeControlOverlay}
              activeTab={activeControlTab}
              onTabChange={(tab) =>
                setActiveControlTab(
                  tab as
                    | "lifecycle"
                    | "sla"
                    | "approvals"
                    | "audit"
                    | "ai-agent",
                )
              }
              vaultId={vaultId}
            />
          </div>
        </>
      )}
    </div>
  );
}
