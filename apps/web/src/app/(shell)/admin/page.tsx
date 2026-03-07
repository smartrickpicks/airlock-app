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

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <ProfileSettings />
      <AppearanceSettings />
    </div>
  );
}
