"use client";

import { Bot } from "lucide-react";
import { useOttoStore } from "@/stores/otto.store";

export default function OttoMessengerToggle() {
  const isMessengerOpen = useOttoStore((s) => s.isMessengerOpen);
  const toggleMessenger = useOttoStore((s) => s.toggleMessenger);
  const unreadCount = useOttoStore((s) => s.unreadCount);

  return (
    <button
      onClick={toggleMessenger}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
        isMessengerOpen
          ? "bg-accent-primary text-white"
          : "bg-surface-raised text-text-secondary hover:bg-surface-hover"
      }`}
      aria-label="Toggle Otto messenger"
    >
      <Bot size={18} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-error text-[9px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
