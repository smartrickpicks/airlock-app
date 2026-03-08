"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import ModuleBar from "@/components/organisms/ModuleBar";
import SubPanel from "@/components/organisms/SubPanel";
import CommandPalette from "@/components/organisms/CommandPalette";
import NotificationCenter from "@/components/organisms/NotificationCenter";
import ToastContainer from "@/components/atoms/Toast";
import OttoDrawer from "@/components/organisms/OttoDrawer";
import MessengerDrawer from "@/components/organisms/MessengerDrawer";
import { useSearchStore } from "@/stores/search.store";
import { useNotificationStore } from "@/stores/notification.store";
import { useRealtimeStore } from "@/stores/realtime.store";
import { useOttoStore } from "@/stores/otto.store";
import { useMessengerStore } from "@/stores/messenger.store";
import { useModuleStore, type ModuleName } from "@/stores/module.store";
import RightToolPushPanel from "@/components/organisms/RightToolPushPanel";
import RightToolRail from "@/components/organisms/RightToolRail";

function deriveModuleFromPath(pathname: string): ModuleName {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/contracts")) return "contracts";
  if (pathname.startsWith("/crm")) return "crm";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/documents")) return "documents";
  return "home";
}

interface ShellLayoutProps {
  children: ReactNode;
}

export default function ShellLayout({ children }: ShellLayoutProps) {
  const pathname = usePathname();
  const setActiveModule = useModuleStore((s) => s.setActiveModule);
  const toggleSearch = useSearchStore((s) => s.toggle);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const connectRealtime = useRealtimeStore((s) => s.connect);
  const disconnectRealtime = useRealtimeStore((s) => s.disconnect);
  const toggleOtto = useOttoStore((s) => s.toggleDrawer);
  const toggleMessenger = useMessengerStore((s) => s.toggleDrawer);
  const fetchMessenger = useMessengerStore((s) => s.fetchMessenger);

  // Sync module store from URL — prevents stale state when navigating
  useEffect(() => {
    const derived = deriveModuleFromPath(pathname);
    const current = useModuleStore.getState().activeModule;
    if (derived !== current) {
      setActiveModule(derived);
    }
  }, [pathname, setActiveModule]);

  // Load notifications, messenger, and connect realtime on mount
  useEffect(() => {
    fetchNotifications();
    fetchMessenger();
    connectRealtime();
    return () => disconnectRealtime();
  }, [fetchNotifications, fetchMessenger, connectRealtime, disconnectRealtime]);

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
        } else if (e.key === "m") {
          e.preventDefault();
          toggleMessenger();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleSearch, toggleOtto, toggleMessenger]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-base">
      <ModuleBar />
      <SubPanel />
      <main className="flex-1 overflow-hidden">{children}</main>
      <RightToolPushPanel />
      <RightToolRail />
      <CommandPalette />
      <NotificationCenter />
      <OttoDrawer />
      <MessengerDrawer />
      <ToastContainer />
    </div>
  );
}
