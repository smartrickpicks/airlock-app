"use client";

import { motion } from "framer-motion";
import { Rocket } from "lucide-react";

interface ForgeLaunchCardProps {
  workspaceName: string;
  moduleCount: number;
  isLaunching: boolean;
  onLaunch: () => void;
}

export default function ForgeLaunchCard({
  workspaceName,
  moduleCount,
  isLaunching,
  onLaunch,
}: ForgeLaunchCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center gap-4 rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-6 text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Rocket className="h-10 w-10 text-accent-primary" />
      </motion.div>

      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-text-primary">
          {workspaceName}
        </h3>
        <p className="text-sm text-text-muted">
          {moduleCount} module{moduleCount !== 1 ? "s" : ""} configured
        </p>
      </div>

      <button
        onClick={onLaunch}
        disabled={isLaunching}
        className="w-full rounded-lg bg-accent-primary py-2.5 text-sm font-semibold text-text-inverse shadow-[0_0_0_0_transparent] transition-all hover:opacity-90 hover:shadow-[0_0_16px_2px_rgba(0,209,255,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLaunching ? "Launching..." : "Launch Workspace"}
      </button>
    </motion.div>
  );
}
