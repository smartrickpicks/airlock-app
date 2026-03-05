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

  // Determine whether we're in Artifact Focus (amber glow on Orchestrate)
  const isArtifactFocus = viewState === "artifact-focus";
  const isGateLock = viewState === "gate-lock";

  // Governance bar for Gate Lock mode
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
            />
          </div>
        </>
      )}

      {/* Signal resize handle (only when expanded) */}
      {signalVisible && <ResizeHandle onDragStart={onSignalDragStart} />}

      {/* === Orchestrate Panel (center) === */}
      <div
        className={`flex-1 min-w-[400px] transition-all ${
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
            />
          </div>
        </>
      )}
    </div>
  );
}
