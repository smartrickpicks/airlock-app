"use client";

import type { ReactNode } from "react";
import ModuleBar from "@/components/organisms/ModuleBar";
import SubPanel from "@/components/organisms/SubPanel";

interface ShellLayoutProps {
  /** Page content rendered in the main area */
  children: ReactNode;
}

/**
 * ShellLayout — Master layout engine.
 *
 * Three-zone horizontal layout:
 *   ModuleBar (72px) | SubPanel (240px) | Main Content (flex-1)
 *
 * This component owns the global shell chrome. Module switching is handled
 * by ModuleBar → useModuleStore. SubPanel reacts to active module.
 */
export default function ShellLayout({ children }: ShellLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-base">
      {/* Zone 1: Module Bar — 72px far-left strip */}
      <ModuleBar />

      {/* Zone 2: Sub-Panel — 240px sidebar with vault navigation */}
      <SubPanel />

      {/* Zone 3: Main content area — fills remaining space */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
