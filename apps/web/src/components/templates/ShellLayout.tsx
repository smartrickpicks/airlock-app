"use client";

import { useEffect, type ReactNode } from "react";
import ModuleBar from "@/components/organisms/ModuleBar";
import SubPanel from "@/components/organisms/SubPanel";
import CommandPalette from "@/components/organisms/CommandPalette";
import NotificationCenter from "@/components/organisms/NotificationCenter";
import ToastContainer from "@/components/atoms/Toast";
import { useSearchStore } from "@/stores/search.store";
import { useNotificationStore } from "@/stores/notification.store";

interface ShellLayoutProps {
  children: ReactNode;
}

export default function ShellLayout({ children }: ShellLayoutProps) {
  const toggle = useSearchStore((s) => s.toggle);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
      <NotificationCenter />
      <ToastContainer />
    </div>
  );
}
