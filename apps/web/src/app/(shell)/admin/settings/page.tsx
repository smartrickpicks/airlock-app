"use client";

import AppearanceSettings from "@/components/organisms/AppearanceSettings";
import NotificationSettings from "@/components/organisms/NotificationSettings";

export default function AdminSettingsPage() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <AppearanceSettings />
      <NotificationSettings />
    </div>
  );
}
