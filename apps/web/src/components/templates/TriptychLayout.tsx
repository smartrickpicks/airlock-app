"use client";

import type { ReactNode } from "react";
import { useTriptychStore } from "@/stores/triptych.store";
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
 * Panel identity (visual design):
 *   Signal      = cyan top border  — data input, live events
 *   Orchestrate = neutral / amber in Artifact Focus — work surface
 *   Control     = indigo top border — metadata, decisions
 *
 * Manages 4 view states:
 *   Standard        — Signal:280 | Orchestrate:flex-1 | Control:300
 *   Artifact Focus  — collapsed sides, Orchestrate ~90%
 *   Action Focus    — collapsed Signal, Orchestrate + Control expanded
 *   Gate Lock       — Standard + Governance bar, Control auto-selects Approvals
 */
export default function TriptychLayout({
  children,
  title = "",
  breadcrumb = "",
  vaultId,
}: TriptychLayoutProps) {
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

  useKeyboardShortcuts();

  const { onDragStart: onSignalDragStart } = useResizable({
    currentWidth: signalWidth,
    minWidth: 200,
    maxWidth: 480,
    direction: "right",
    onResize: setSignalWidth,
  });

  const { onDragStart: onControlDragStart } = useResizable({
    currentWidth: controlWidth,
    minWidth: 200,
    maxWidth: 480,
    direction: "left",
    onResize: setControlWidth,
  });

  const isArtifactFocus = viewState === "artifact-focus";
  const isGateLock = viewState === "gate-lock";

  const governanceBar = isGateLock ? (
    <GovernanceBar
      gateLabel="GATE REVIEW REQUIRED"
      slaTimeRemaining="4h 12m"
      onApprove={() => {}}
      onReject={() => {}}
      onClarify={() => {}}
      onHold={() => {}}
    />
  ) : null;

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* === Signal Panel (left) — cyan identity === */}
      <div
        className="transition-all flex-shrink-0 border-t-2 border-t-panel-signal"
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

      {/* Signal overlay */}
      {!signalVisible && signalOverlayOpen && (
        <>
          <div className="fixed inset-0 z-overlay" onClick={closeSignalOverlay} />
          <div
            className="absolute top-0 bottom-0 z-overlay bg-surface-raised border-r border-surface-border border-t-2 border-t-panel-signal shadow-xl shadow-panel-signal/10"
            style={{ left: COLLAPSED_WIDTH, width: signalWidth }}
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

      {signalVisible && <ResizeHandle onDragStart={onSignalDragStart} />}

      {/* === Orchestrate Panel (center) — amber accent in artifact focus === */}
      <div
        className={`flex-1 min-w-[400px] transition-all border-t-2 ${
          isArtifactFocus
            ? "border-t-gate-amber shadow-[0_0_32px_rgba(245,158,11,0.12)] ring-1 ring-gate-amber/20"
            : "border-t-surface-border"
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

      {controlVisible && <ResizeHandle onDragStart={onControlDragStart} />}

      {/* === Control Panel (right) — indigo identity === */}
      <div
        className="transition-all flex-shrink-0 border-t-2 border-t-panel-control"
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

      {/* Control overlay */}
      {!controlVisible && controlOverlayOpen && (
        <>
          <div className="fixed inset-0 z-overlay" onClick={closeControlOverlay} />
          <div
            className="absolute top-0 bottom-0 right-0 z-overlay bg-surface-raised border-l border-surface-border border-t-2 border-t-panel-control shadow-xl shadow-panel-control/10"
            style={{ right: COLLAPSED_WIDTH, width: controlWidth }}
          >
            <ControlPanel
              width={controlWidth}
              collapsed={false}
              onOverlayToggle={closeControlOverlay}
              activeTab={activeControlTab}
              onTabChange={(tab) =>
                setActiveControlTab(
                  tab as "lifecycle" | "sla" | "approvals" | "audit" | "ai-agent",
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
