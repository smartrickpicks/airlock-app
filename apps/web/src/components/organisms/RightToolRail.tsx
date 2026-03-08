"use client";

import {
  Bell,
  Bot,
  MessageCircle,
  PenSquare,
  Sparkles,
  Inbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNotificationStore } from "@/stores/notification.store";
import { useMessengerStore } from "@/stores/messenger.store";
import { useShellStore, type RightToolId } from "@/stores/shell.store";
import { useOttoStore } from "@/stores/otto.store";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface ToolConfig {
  id: RightToolId;
  label: string;
  icon: LucideIcon;
}

const TOOLS: ToolConfig[] = [
  { id: "activity", label: "Activity", icon: Bell },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "messenger", label: "Messenger", icon: MessageCircle },
  { id: "otto", label: "Otto", icon: Bot },
  { id: "compose", label: "Compose", icon: PenSquare },
  { id: "quick_actions", label: "Quick Actions", icon: Sparkles },
];

export default function RightToolRail() {
  const activeRightTool = useShellStore((s) => s.activeRightTool);
  const openTool = useShellStore((s) => s.openTool);
  const closeTool = useShellStore((s) => s.closeTool);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const unreadMessenger = useMessengerStore((s) => s.totalUnread);
  const openMessenger = useMessengerStore((s) => s.openDrawer);
  const closeMessenger = useMessengerStore((s) => s.closeDrawer);
  const isMessengerOpen = useMessengerStore((s) => s.isDrawerOpen);
  const isOttoOpen = useOttoStore((s) => s.isDrawerOpen);
  const openOtto = useOttoStore((s) => s.openDrawer);
  const closeOtto = useOttoStore((s) => s.closeDrawer);

  const isClean = getWorkspaceMode() === "clean";

  const badgeCountFor = (id: RightToolId) => {
    if (isClean) return 0;
    if (id === "activity") return unreadNotifications();
    if (id === "messenger") return unreadMessenger();
    if (id === "otto") return isOttoOpen ? 1 : 0;
    return 0;
  };

  return (
    <aside className="flex h-full w-[68px] flex-shrink-0 flex-col items-center border-l border-surface-border bg-[#040916] py-4">
      <div className="flex flex-1 flex-col items-center gap-2">
        {TOOLS.map(({ id, label, icon: Icon }) => {
          const isActive = activeRightTool === id;
          const badgeCount = badgeCountFor(id);
          return (
            <button
              key={id}
              className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-fast ${
                isActive
                  ? "border-cyan-300/35 bg-surface-overlay text-accent-primary shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                  : "border-transparent bg-transparent text-text-muted hover:border-surface-border hover:bg-surface-overlay hover:text-text-primary"
              }`}
              aria-label={label}
              title={label}
              onClick={() => {
                if (id === "messenger") {
                  if (activeRightTool === "messenger" || isMessengerOpen) {
                    closeMessenger();
                    closeTool();
                  } else {
                    closeOtto();
                    openTool("messenger");
                    openMessenger();
                  }
                  return;
                }

                if (id === "otto") {
                  if (activeRightTool === "otto" || isOttoOpen) {
                    closeOtto();
                    closeTool();
                  } else {
                    closeMessenger();
                    openTool("otto");
                    openOtto();
                  }
                  return;
                }

                if (activeRightTool === id) {
                  closeTool();
                } else {
                  closeTool();
                  openTool(id);
                }
              }}
            >
              <Icon size={18} />
              {badgeCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-danger px-1 text-[9px] font-bold text-white">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 pt-3">
        <div className="h-px w-8 bg-surface-border" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay text-[10px] font-semibold text-text-secondary">
          {isClean ? 0 : 4}
        </div>
      </div>
    </aside>
  );
}
