"use client";

import { motion } from "framer-motion";
import ConnectorsView from "@/components/organisms/ConnectorsView";
import { fadeInUp } from "@/lib/animations";

export default function AdminConnectorsPage() {
  return (
    <motion.div
      className="h-full overflow-y-auto flex flex-col gap-6 p-6"
      {...fadeInUp}
    >
      <ConnectorsView />
    </motion.div>
  );
}
