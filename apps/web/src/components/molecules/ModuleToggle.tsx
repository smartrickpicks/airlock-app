"use client";

import {
  FileStack,
  UsersRound,
  CheckSquare,
  Calendar,
  FileBadge,
} from "lucide-react";
import type { ElementType } from "react";

interface ModuleItem {
  id: string;
  label: string;
  active: boolean;
}

interface ModuleToggleProps {
  modules: ModuleItem[];
  onToggle: (id: string) => void;
}

const MODULE_ICONS: Record<string, ElementType> = {
  contracts: FileStack,
  crm: UsersRound,
  tasks: CheckSquare,
  calendar: Calendar,
  documents: FileBadge,
};

export default function ModuleToggle({ modules, onToggle }: ModuleToggleProps) {
  return (
    <div className="flex items-center gap-1.5">
      {modules.map((mod) => {
        const Icon = MODULE_ICONS[mod.id] || FileBadge;
        return (
          <button
            key={mod.id}
            onClick={() => onToggle(mod.id)}
            title={mod.label}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              mod.active
                ? "bg-accent-primary/15 text-accent-primary border border-accent-primary/30"
                : "bg-surface-overlay text-text-muted border border-surface-border hover:text-text-secondary hover:border-surface-border"
            }`}
          >
            <Icon size={14} />
            <span>{mod.label}</span>
          </button>
        );
      })}
    </div>
  );
}
