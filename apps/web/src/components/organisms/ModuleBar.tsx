"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { SlidersHorizontal, DoorOpen } from "lucide-react";
import type { ModuleName } from "@/lib/constants";
import { MODULES } from "@/lib/constants";
import { useModuleStore } from "@/stores/module.store";
import { useAuthStore } from "@/stores/auth.store";
import AirlockIcon from "@/components/atoms/AirlockIcon";
import ModuleIcon from "@/components/molecules/ModuleIcon";
import ConnectionStatus from "@/components/atoms/ConnectionStatus";
import PresenceAvatars from "@/components/molecules/PresenceAvatars";

/** Map module keys to brand PNG paths */
const MODULE_BRAND_ICONS: Record<ModuleName, string> = {
  contracts: "/assets/brand/icons/mod-contracts.png",
  crm: "/assets/brand/icons/mod-crm.png",
  tasks: "/assets/brand/icons/mod-triage.png",
  calendar: "/assets/brand/icons/mod-calendar.png",
  documents: "/assets/brand/icons/mod-documents.png",
};

export default function ModuleBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeModule, setActiveModule } = useModuleStore();
  const user = useAuthStore((s) => s.user);

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
        {/* Airlock brand mark */}
        <Image
          src="/assets/brand/airlock-256.png"
          alt="Airlock"
          width={32}
          height={32}
          className="rounded-lg mb-2"
        />

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
          <AirlockIcon name="lockmark" size="xl" animate="entrance" />
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
            const isActive = key === activeModule;

            return (
              <ModuleIcon
                key={key}
                label={mod.label}
                isActive={isActive}
                onClick={() => {
                  setActiveModule(key);
                  const lastView =
                    useModuleStore.getState().lastVisitedView[key];
                  router.push(lastView || mod.path);
                }}
              >
                <Image
                  src={MODULE_BRAND_ICONS[key]}
                  alt={mod.label}
                  width={24}
                  height={24}
                  className="rounded"
                />
              </ModuleIcon>
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

        {/* User avatar */}
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name || "User"}
            className="w-9 h-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
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
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}

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
