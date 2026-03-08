"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/stores/admin.store";
import MembersTable from "@/components/organisms/MembersTable";
import PermissionMatrix from "@/components/organisms/PermissionMatrix";

export default function AdminMembersPage() {
  const { fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <MembersTable />
      <PermissionMatrix />
    </div>
  );
}
