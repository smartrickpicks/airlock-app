"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/stores/admin.store";
import FeatureFlags from "@/components/organisms/FeatureFlags";

export default function AdminFeaturesPage() {
  const { fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <FeatureFlags />
    </div>
  );
}
