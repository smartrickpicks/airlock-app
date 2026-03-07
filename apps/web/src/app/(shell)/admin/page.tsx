"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminStore } from "@/stores/admin.store";
import ProfileSettings from "@/components/organisms/ProfileSettings";
import AppearanceSettings from "@/components/organisms/AppearanceSettings";

const NAV_ITEMS = [
  { label: "Profile", href: "/admin" },
  { label: "Appearance", href: "/admin/settings" },
  { label: "Members", href: "/admin/members" },
  { label: "Feature Flags", href: "/admin/features" },
  { label: "Event Bus", href: "/admin/event-bus" },
  { label: "Workflows", href: "/admin/workflows" },
];

export default function AdminPage() {
  const pathname = usePathname();
  const { fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  const handleResetWorkspace = () => {
    // Clear all airlock localStorage keys
    const keysToRemove = Object.keys(localStorage).filter((k) =>
      k.startsWith("airlock_"),
    );
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // Clear auth cookie
    document.cookie = "airlock_access_token=; path=/; max-age=0; SameSite=Lax";

    // Hard refresh to clear all Zustand stores
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Admin & Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Workspace configuration and personal preferences
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-surface-border">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-accent-primary text-accent-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Profile + Appearance (default admin page) */}
      <ProfileSettings />
      <AppearanceSettings />

      {/* Developer Tools */}
      <div className="rounded-2xl border border-accent-danger/20 bg-accent-danger/5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent-danger">
          Developer Tools
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Reset all client-side workspace data and return to login.
        </p>
        <button
          onClick={handleResetWorkspace}
          className="mt-4 rounded-lg border border-accent-danger/40 bg-surface-overlay px-4 py-2 text-sm font-medium text-accent-danger transition-colors hover:bg-accent-danger/10"
        >
          Reset Workspace
        </button>
      </div>
    </div>
  );
}
