"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/stores/admin.store";
import ProfileSettings from "@/components/organisms/ProfileSettings";

export default function AdminProfilePage() {
  const { fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl">
        <ProfileSettings />
      </div>
    </div>
  );
}
