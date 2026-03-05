"use client";

import { useEffect, type ReactNode } from "react";
import ModuleBar from "@/components/organisms/ModuleBar";
import SubPanel from "@/components/organisms/SubPanel";
import CommandPalette from "@/components/organisms/CommandPalette";
import { useSearchStore } from "@/stores/search.store";

interface ShellLayoutProps {
  children: ReactNode;
}

export default function ShellLayout({ children }: ShellLayoutProps) {
  const toggle = useSearchStore((s) => s.toggle);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-base">
      <ModuleBar />
      <SubPanel />
      <main className="flex-1 overflow-hidden">{children}</main>
      <CommandPalette />
    </div>
  );
}
