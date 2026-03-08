"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  CheckSquare,
  Calendar,
  FolderOpen,
  Settings,
  Bell,
  Bot,
  MessageCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MODULES, type ModuleName } from "@/lib/constants";
import { useModuleStore } from "@/stores/module.store";
import { useNotificationStore } from "@/stores/notification.store";
import { useOttoStore } from "@/stores/otto.store";
import { useMessengerStore } from "@/stores/messenger.store";
import ModuleIcon from "@/components/molecules/ModuleIcon";
import ConnectionStatus from "@/components/atoms/ConnectionStatus";
import PresenceAvatars from "@/components/molecules/PresenceAvatars";

/** Map module icon string names to actual Lucide components */
const moduleIconMap: Record<string, LucideIcon> = {
  FileText,
  Users,
  CheckSquare,
  Calendar,
  File: FolderOpen,
};

export default function ModuleBar() {
  const router = useRouter();
  const { activeModule, setActiveModule } = useModuleStore();
  const toggleNotifications = useNotificationStore((s) => s.toggle);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const toggleOtto = useOttoStore((s) => s.toggleDrawer);
  const toggleMessenger = useMessengerStore((s) => s.toggleDrawer);
  const messengerUnread = useMessengerStore((s) => s.totalUnread);

  const moduleKeys = Object.keys(MODULES) as ModuleName[];

  return (
    <nav
      className="w-[72px] h-full bg-surface-sunken border-r border-surface-border flex flex-col items-center flex-shrink-0"
      aria-label="Module navigation"
    >
      {/* Top section: logo + module icons */}
      <div className="flex-1 flex flex-col items-center pt-4">
        {/* Airlock home icon */}
        <button
          className="
            w-10 h-10 rounded-xl
            bg-gradient-to-br from-blue-500 via-teal-400 to-cyan-400
            flex items-center justify-center
            cursor-pointer
            transition-transform duration-fast
            hover:scale-105
          "
          aria-label="Airlock home"
          onClick={() => router.push("/")}
        >
          <span className="text-white font-bold text-lg select-none">A</span>
        </button>

        {/* Spacer */}
        <div className="h-2" />

        {/* Divider */}
        <div className="w-8 h-px bg-surface-border mx-auto" />

        {/* Spacer */}
        <div className="h-2" />

        {/* Module icons */}
        <div className="flex flex-col items-center gap-2">
          {moduleKeys.map((key) => {
            const mod = MODULES[key];
            const IconComponent = moduleIconMap[mod.icon];
            const isActive = key === activeModule;

            return (
              <ModuleIcon
                key={key}
                icon={IconComponent}
                label={mod.label}
                isActive={isActive}
                onClick={() => {
                  setActiveModule(key);
                  const lastView =
                    useModuleStore.getState().lastVisitedView[key];
                  router.push(lastView || mod.path);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom section: user avatar + settings */}
      <div className="pb-4 flex flex-col items-center gap-2">
        {/* Presence avatars */}
        <PresenceAvatars />

        {/* Connection status */}
        <ConnectionStatus />

        {/* Divider */}
        <div className="w-8 h-px bg-surface-border mx-auto" />

        {/* User avatar placeholder */}
        <div
          className="
            w-9 h-9 rounded-full
            bg-surface-overlay
            flex items-center justify-center
            text-text-muted text-sm font-medium
            select-none
          "
          aria-label="User avatar"
        >
          ?
        </div>

        {/* Messenger */}
        <button
          className="
            relative
            text-text-muted hover:text-accent-primary
            cursor-pointer
            transition-colors duration-fast
          "
          aria-label="Messenger"
          title="Messenger (Cmd+M)"
          onClick={toggleMessenger}
        >
          <MessageCircle size={20} />
          {messengerUnread() > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-error text-[8px] font-bold text-white">
              {messengerUnread() > 9 ? "9+" : messengerUnread()}
            </span>
          )}
        </button>

        {/* Otto AI */}
        <button
          className="
            text-text-muted hover:text-accent-primary
            cursor-pointer
            transition-colors duration-fast
          "
          aria-label="Otto AI Assistant"
          title="Otto (Cmd+J)"
          onClick={toggleOtto}
        >
          <Bot size={20} />
        </button>

        {/* Notification bell */}
        <button
          className="
            relative
            text-text-muted hover:text-text-primary
            cursor-pointer
            transition-colors duration-fast
          "
          aria-label="Notifications"
          onClick={toggleNotifications}
        >
          <Bell size={20} />
          {unreadCount() > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-danger text-[8px] font-bold text-white">
              {unreadCount() > 9 ? "9+" : unreadCount()}
            </span>
          )}
        </button>

        {/* Settings gear */}
        <button
          className="
            text-text-muted hover:text-text-primary
            cursor-pointer
            transition-colors duration-fast
          "
          aria-label="Settings"
          onClick={() => {
            setActiveModule("admin");
            router.push("/admin");
          }}
        >
          <Settings size={20} />
        </button>
      </div>
    </nav>
  );
}
