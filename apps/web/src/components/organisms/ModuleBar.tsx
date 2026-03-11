"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Users,
  CheckSquare,
  Calendar,
  FolderOpen,
  SlidersHorizontal,
  DoorOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MODULES, type ModuleName } from "@/lib/constants";
import { useModuleStore } from "@/stores/module.store";
import { useAuthStore } from "@/stores/auth.store";
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
  const pathname = usePathname();
  const router = useRouter();
  const { activeModule, setActiveModule } = useModuleStore();

  const handleLogout = () => {
    useAuthStore.getState().logout();
    window.location.href = "/login";
  };

  const moduleKeys = Object.keys(MODULES) as ModuleName[];
  const isAdminRoute = pathname.startsWith("/admin");
  const isHomeActive = pathname === "/";

  return (
    <nav
      className="theme-module-bar w-[72px] h-full border-r border-surface-border flex flex-col items-center flex-shrink-0"
      aria-label="Module navigation"
    >
      {/* Top section: logo + module icons */}
      <div className="flex-1 flex flex-col items-center pt-4">
        {/* Airlock home icon */}
        <button
          className="
            relative
            w-[58px] h-[58px] rounded-[20px]
            bg-[#040916]
            border border-cyan-400/20
            flex items-center justify-center
            cursor-pointer
            overflow-hidden
            transition-all duration-fast
            shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_0_18px_rgba(34,211,238,0.18)]
            hover:scale-105 hover:border-cyan-300/45 hover:shadow-[0_0_0_1px_rgba(103,232,249,0.25),0_0_26px_rgba(34,211,238,0.3)]
          "
          aria-label="Airlock home"
          onClick={() => {
            setActiveModule("home");
            router.push("/dispatch");
          }}
        >
          {isHomeActive ? (
            <span className="absolute -left-3 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-accent-primary" />
          ) : null}
          <Image
            src="/assets/padlock_no_bg.png"
            alt="Airlock lockmark"
            width={92}
            height={92}
            className="h-[90px] w-[90px] select-none object-contain"
            priority
          />
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

        {/* Logout */}
        <button
          className="text-text-muted hover:text-text-primary cursor-pointer transition-colors duration-fast"
          aria-label="Log out"
          title="Log out"
          onClick={handleLogout}
        >
          <DoorOpen size={18} />
        </button>

        {/* Settings gear */}
        <button
          className="
            relative
            text-text-muted hover:text-text-primary
            cursor-pointer
            transition-colors duration-fast
          "
          aria-label="Settings"
          title="Admin & Settings"
          onClick={() => {
            setActiveModule("admin");
            router.push("/admin");
          }}
        >
          <SlidersHorizontal size={20} />
          {isAdminRoute ? (
            <span className="absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent-primary" />
          ) : null}
        </button>
      </div>
    </nav>
  );
}
