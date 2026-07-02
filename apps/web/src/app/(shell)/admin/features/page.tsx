"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAdminStore } from "@/stores/admin.store";
import FeatureFlags from "@/components/organisms/FeatureFlags";
import { fadeInUp } from "@/lib/animations";

export default function AdminFeaturesPage() {
  const { fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  return (
    <motion.div
      className="h-full overflow-y-auto flex flex-col gap-6 p-6"
      {...fadeInUp}
    >
      <FeatureFlags />
    </motion.div>
  );
}
