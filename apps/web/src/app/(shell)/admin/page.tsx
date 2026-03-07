"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/stores/admin.store";
import ProfileSettings from "@/components/organisms/ProfileSettings";
import AppearanceSettings from "@/components/organisms/AppearanceSettings";

export default function AdminPage() {
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
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
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
