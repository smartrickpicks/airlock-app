"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  CheckSquare,
  Calendar,
  FolderOpen,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MODULES, type ModuleName } from "@/lib/constants";
import { useModuleStore } from "@/stores/module.store";
import ModuleIcon from "@/components/molecules/ModuleIcon";

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
                  router.push(mod.path);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom section: user avatar + settings */}
      <div className="pb-4 flex flex-col items-center gap-2">
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

        {/* Settings gear */}
        <button
          className="
            text-text-muted hover:text-text-primary
            cursor-pointer
            transition-colors duration-fast
          "
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </nav>
  );
}
