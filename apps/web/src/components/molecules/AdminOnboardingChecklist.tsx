"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboarding.store";
import {
  staggerContainer,
  staggerItem,
  progressSpring,
} from "@/lib/animations";

export default function AdminOnboardingChecklist() {
  const adminChecklist = useOnboardingStore((s) => s.adminChecklist);
  const progress = useOnboardingStore((s) => s.adminChecklistProgress);
  const [collapsed, setCollapsed] = useState(false);

  const { completed, total } = progress();
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const allDone = completed === total;

  if (allDone) {
    return (
      <motion.div
        className="rounded-xl border border-accent-success/30 bg-accent-success/5 p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 text-accent-success">
          <ShieldCheck size={16} />
          <span className="text-sm font-semibold">Admin setup complete</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          All configuration steps are done. Your workspace is fully operational.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-accent-primary" />
          <span className="text-xs font-semibold text-text-primary">
            Admin Setup
          </span>
          <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-[10px] font-bold text-accent-primary">
            {completed}/{total}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown size={14} className="text-text-muted" />
        ) : (
          <ChevronUp size={14} className="text-text-muted" />
        )}
      </button>

      {/* Progress bar */}
      <div className="mx-4 mb-3 h-1 overflow-hidden rounded-full bg-surface-sunken">
        <motion.div
          className="h-full rounded-full bg-accent-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={progressSpring}
        />
      </div>

      {/* Items */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="px-4 pb-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, height: 0 }}
          >
            {adminChecklist.map((item) => (
              <motion.div
                key={item.id}
                variants={staggerItem}
                className="flex items-center gap-2.5 py-1.5"
              >
                {item.completed ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <CheckCircle
                      size={14}
                      className="text-accent-success shrink-0"
                    />
                  </motion.div>
                ) : (
                  <Circle size={14} className="text-text-muted shrink-0" />
                )}
                <span
                  className={`text-xs ${
                    item.completed
                      ? "text-text-muted line-through"
                      : "text-text-primary"
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
