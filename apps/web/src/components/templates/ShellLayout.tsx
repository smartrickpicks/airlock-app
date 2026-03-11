"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ModuleBar from "@/components/organisms/ModuleBar";
import SubPanel from "@/components/organisms/SubPanel";
import CommandPalette from "@/components/organisms/CommandPalette";
import NotificationCenter from "@/components/organisms/NotificationCenter";
import ToastContainer from "@/components/atoms/Toast";
import OttoDrawer from "@/components/organisms/OttoDrawer";
import MessengerDrawer from "@/components/organisms/MessengerDrawer";
import WelcomeModal from "@/components/organisms/WelcomeModal";
import { useSearchStore } from "@/stores/search.store";
import { useNotificationStore } from "@/stores/notification.store";
import { useRealtimeStore } from "@/stores/realtime.store";
import { useOttoStore } from "@/stores/otto.store";
import { useMessengerStore } from "@/stores/messenger.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { useModuleStore, type ModuleName } from "@/stores/module.store";
import RightToolPushPanel from "@/components/organisms/RightToolPushPanel";
import RightToolRail from "@/components/organisms/RightToolRail";
import OttoMessengerBar from "@/components/organisms/OttoMessengerBar";
import AirlockIconDefs from "@/components/atoms/AirlockIconDefs";

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
  const connectRealtime = useRealtimeStore((s) => s.connectReal);
  const disconnectRealtime = useRealtimeStore((s) => s.disconnect);
  const toggleOtto = useOttoStore((s) => s.toggleDrawer);
  const toggleMessenger = useMessengerStore((s) => s.toggleDrawer);
  const fetchMessenger = useMessengerStore((s) => s.fetchMessenger);
  const welcomeSeen = useOnboardingStore((s) => s.welcomeSeen);
  const [showWelcome, setShowWelcome] = useState(false);

  // Show welcome modal after shell mounts if user hasn't seen it
  useEffect(() => {
    if (!welcomeSeen) {
      // Small delay so the shell animates in first
      const timer = setTimeout(() => setShowWelcome(true), 600);
      return () => clearTimeout(timer);
    }
  }, [welcomeSeen]);

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
      <AirlockIconDefs />
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <ModuleBar />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
        className="flex"
      >
        <SubPanel />
      </motion.div>
      <motion.main
        className="flex-1 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
      >
        {children}
      </motion.main>
      <RightToolPushPanel />
      <RightToolRail />
      <CommandPalette />
      <NotificationCenter />
      <OttoDrawer />
      <MessengerDrawer />
      <ToastContainer />
      <OttoMessengerBar />
      <AnimatePresence>
        {showWelcome && !welcomeSeen && (
          <WelcomeModal onClose={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
