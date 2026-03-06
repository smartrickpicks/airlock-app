"use client";

import { useEffect, type ReactNode } from "react";
import ModuleBar from "@/components/organisms/ModuleBar";
import SubPanel from "@/components/organisms/SubPanel";
import CommandPalette from "@/components/organisms/CommandPalette";
import NotificationCenter from "@/components/organisms/NotificationCenter";
import ToastContainer from "@/components/atoms/Toast";
import OttoDrawer from "@/components/organisms/OttoDrawer";
import { useSearchStore } from "@/stores/search.store";
import { useNotificationStore } from "@/stores/notification.store";
import { useRealtimeStore } from "@/stores/realtime.store";
import { useOttoStore } from "@/stores/otto.store";

interface ShellLayoutProps {
  children: ReactNode;
}

export default function ShellLayout({ children }: ShellLayoutProps) {
  const toggleSearch = useSearchStore((s) => s.toggle);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const connectRealtime = useRealtimeStore((s) => s.connect);
  const disconnectRealtime = useRealtimeStore((s) => s.disconnect);
  const toggleOtto = useOttoStore((s) => s.toggleDrawer);

  // Load notifications and connect realtime on mount
  useEffect(() => {
    fetchNotifications();
    connectRealtime();
    return () => disconnectRealtime();
  }, [fetchNotifications, connectRealtime, disconnectRealtime]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k") {
          e.preventDefault();
          toggleSearch();
        } else if (e.key === "j") {
          e.preventDefault();
          toggleOtto();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleSearch, toggleOtto]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-base">
      <ModuleBar />
      <SubPanel />
      <main className="flex-1 overflow-hidden">{children}</main>
      <CommandPalette />
      <NotificationCenter />
      <OttoDrawer />
      <ToastContainer />
    </div>
  );
}
