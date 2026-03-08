"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/stores/admin.store";
import MembersTable from "@/components/organisms/MembersTable";

export default function AdminMembersPage() {
  const { fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <MembersTable />
    </div>
  );
}
