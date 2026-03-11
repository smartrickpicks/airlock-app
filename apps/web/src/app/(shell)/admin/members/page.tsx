"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAdminStore } from "@/stores/admin.store";
import MembersTable from "@/components/organisms/MembersTable";
import { fadeInUp } from "@/lib/animations";

export default function AdminMembersPage() {
  const { fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  return (
    <motion.div className="h-full overflow-y-auto p-6" {...fadeInUp}>
      <MembersTable />
    </motion.div>
  );
}
