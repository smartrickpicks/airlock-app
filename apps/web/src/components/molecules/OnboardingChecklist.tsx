"use client";

import { motion } from "framer-motion";
import { CircleCheckBig, CircleDashed, X, Sparkles } from "lucide-react";
import { useOnboardingStore } from "@/stores/onboarding.store";
import {
  staggerContainer,
  staggerItem,
  progressSpring,
  scaleIn,
} from "@/lib/animations";

export default function OnboardingChecklist() {
  const {
    userChecklist,
    checklistDismissed,
    dismissChecklist,
    userChecklistProgress,
    isOnboardingComplete,
  } = useOnboardingStore();

  const { completed, total } = userChecklistProgress();

  if (checklistDismissed) return null;

  const allDone = isOnboardingComplete();
  const progressPercent = (completed / total) * 100;

  return (
    <motion.div
      className="rounded-lg border border-surface-border bg-surface-raised overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          {allDone ? (
            <motion.div {...scaleIn}>
              <Sparkles size={16} className="text-accent-success" />
            </motion.div>
          ) : (
            <span className="text-sm font-semibold text-text-primary">
              Getting Started
            </span>
          )}
          {allDone ? (
            <motion.span
              className="text-sm font-semibold text-accent-success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              All done!
            </motion.span>
          ) : (
            <span className="text-xs text-text-muted">
              {completed} / {total}
            </span>
          )}
        </div>
        <button
          onClick={dismissChecklist}
          className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-border/50 hover:text-text-primary"
          title="Dismiss checklist"
        >
          <X size={14} />
        </button>
      </div>

      {/* Animated progress bar */}
      <div className="px-4 pt-3">
        <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={progressSpring}
          />
        </div>
      </div>

      {/* Checklist items with stagger */}
      <motion.div
        className="p-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <ul className="space-y-2">
          {userChecklist.map((item) => (
            <motion.li
              key={item.id}
              className="flex items-center gap-2.5"
              variants={staggerItem}
            >
              {item.completed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                >
                  <CircleCheckBig
                    size={16}
                    className="shrink-0 text-accent-success"
                  />
                </motion.div>
              ) : (
                <CircleDashed size={16} className="shrink-0 text-text-muted" />
              )}
              <span
                className={`text-sm transition-all duration-normal ${
                  item.completed
                    ? "text-text-muted line-through"
                    : "text-text-primary"
                }`}
              >
                {item.label}
              </span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
