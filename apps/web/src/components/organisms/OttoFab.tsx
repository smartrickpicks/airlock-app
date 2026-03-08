"use client";

import { Bot } from "lucide-react";
import { useShellStore } from "@/stores/shell.store";
import { useOttoStore } from "@/stores/otto.store";
import { useMessengerStore } from "@/stores/messenger.store";

export default function OttoFab() {
  const activeRightTool = useShellStore((s) => s.activeRightTool);
  const openTool = useShellStore((s) => s.openTool);
  const closeTool = useShellStore((s) => s.closeTool);
  const openOtto = useOttoStore((s) => s.openDrawer);
  const closeOtto = useOttoStore((s) => s.closeDrawer);
  const closeMessenger = useMessengerStore((s) => s.closeDrawer);
  const isOttoOpen = useOttoStore((s) => s.isDrawerOpen);

  if (activeRightTool === "otto") return null;

  return (
    <button
      className="fixed bottom-6 right-[92px] z-[var(--z-modal)] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/30 bg-[#071120] text-accent-primary shadow-[0_0_24px_rgba(34,211,238,0.22)] transition-all duration-fast hover:scale-105 hover:border-cyan-300/50 hover:shadow-[0_0_32px_rgba(34,211,238,0.32)]"
      aria-label="Open Otto"
      title="Otto AI Assistant"
      onClick={() => {
        if (isOttoOpen) {
          closeOtto();
          closeTool();
          return;
        }
        closeMessenger();
        openTool("otto");
        openOtto();
      }}
    >
      <Bot size={20} />
    </button>
  );
}
