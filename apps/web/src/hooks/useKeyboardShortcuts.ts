"use client";

import { useEffect } from "react";
import { useTriptychStore } from "@/stores/triptych.store";
import type { ViewState } from "@/stores/triptych.store";

/**
 * Keyboard shortcuts for Triptych view state switching.
 *
 * - Cmd/Ctrl+1 → Standard view
 * - Cmd/Ctrl+2 → Artifact Focus
 * - Cmd/Ctrl+3 → Action Focus
 * - Cmd/Ctrl+4 → Gate Lock (no-op if no active gate)
 * - Escape     → Return to Standard
 */
export function useKeyboardShortcuts() {
  const setViewState = useTriptychStore((s) => s.setViewState);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + number → view state switching
      if (isMeta) {
        let targetState: ViewState | null = null;

        switch (e.key) {
          case "1":
            targetState = "standard";
            break;
          case "2":
            targetState = "artifact-focus";
            break;
          case "3":
            targetState = "action-focus";
            break;
          case "4":
            targetState = "gate-lock";
            break;
          default:
            return;
        }

        if (targetState) {
          e.preventDefault();
          setViewState(targetState);
        }
      }

      // Escape → return to Standard
      if (e.key === "Escape") {
        e.preventDefault();
        setViewState("standard");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setViewState]);
}
