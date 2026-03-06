"use client";

import { useEffect } from "react";
import { useOttoStore } from "@/stores/otto.store";
import OttoChat from "@/components/organisms/OttoChat";

export default function OttoDrawer() {
  const { isDrawerOpen, closeDrawer } = useOttoStore();

  // Close on Escape
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--z-overlay)]"
        onClick={closeDrawer}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 z-[var(--z-modal)] h-full w-full max-w-sm border-l border-surface-border bg-surface-raised shadow-2xl">
        <OttoChat />
      </div>
    </>
  );
}
