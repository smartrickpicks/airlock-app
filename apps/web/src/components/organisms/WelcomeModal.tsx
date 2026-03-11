"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  LayoutList,
  Vault,
  ShieldCheck,
  ListChecks,
  FileDiff,
  Crown,
  Settings,
  Activity,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import type { WelcomeSlide } from "@/lib/mock-onboarding";
import { WELCOME_SLIDES } from "@/lib/mock-onboarding";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { useAuthStore } from "@/stores/auth.store";
import { modalOverlay, modalContent } from "@/lib/animations";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  wrench: Wrench,
  "layout-list": LayoutList,
  vault: Vault,
  "shield-check": ShieldCheck,
  "list-checks": ListChecks,
  "file-diff": FileDiff,
  crown: Crown,
  settings: Settings,
  activity: Activity,
};

interface WelcomeModalProps {
  onClose: () => void;
}

export default function WelcomeModal({ onClose }: WelcomeModalProps) {
  const { markWelcomeSeen } = useOnboardingStore();
  const { moduleRoles } = useAuthStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation + focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        markWelcomeSeen();
        onClose();
      }
    },
    [markWelcomeSeen, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Focus the modal on mount for screen readers
    modalRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Determine role for slides — default to builder
  const primaryRole = Object.values(moduleRoles)[0] || "builder";
  const roleKey =
    primaryRole === "gatekeeper"
      ? "gatekeeper"
      : primaryRole === "owner"
        ? "owner"
        : "builder";

  const slides: WelcomeSlide[] =
    WELCOME_SLIDES[roleKey] || WELCOME_SLIDES.builder;
  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;
  const Icon = ICON_MAP[slide.icon] || Activity;

  function handleClose() {
    markWelcomeSeen();
    onClose();
  }

  function handleNext() {
    if (isLast) {
      handleClose();
    } else {
      setDirection(1);
      setCurrentSlide((s) => s + 1);
    }
  }

  function handleBack() {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((s) => s - 1);
    }
  }

  const slideVariants = {
    initial: (dir: number) => ({
      opacity: 0,
      x: dir * 60,
      scale: 0.97,
    }),
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir * -60,
      scale: 0.97,
      transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
    }),
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      variants={modalOverlay}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* Modal */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Airlock"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-xl border border-surface-border/80 bg-surface-overlay/95 backdrop-blur-xl shadow-2xl shadow-black/50 focus:outline-none"
        variants={modalContent}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close welcome modal"
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-border/50 hover:text-text-primary"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center px-8 pb-6 pt-10 text-center overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center"
            >
              {/* Icon */}
              <motion.div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary/10 border border-accent-primary/20"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1,
                }}
              >
                <Icon size={32} className="text-accent-primary" />
              </motion.div>

              {/* Title */}
              <h2 className="mb-2 text-lg font-bold text-text-primary">
                {slide.title}
              </h2>

              {/* Description */}
              <p className="mb-8 text-sm leading-relaxed text-text-secondary max-w-xs">
                {slide.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="mb-6 flex gap-2">
            {slides.map((_, i) => (
              <motion.div
                key={i}
                className="h-1.5 rounded-full"
                animate={{
                  width: i === currentSlide ? 24 : 6,
                  backgroundColor:
                    i === currentSlide
                      ? "var(--accent-primary)"
                      : "var(--surface-border)",
                }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex w-full items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentSlide === 0}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-border/50 disabled:invisible"
            >
              <ChevronLeft size={14} />
              Back
            </button>

            <motion.button
              onClick={handleNext}
              className="flex items-center gap-1 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-surface-base transition-colors hover:bg-accent-primary-hover"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight size={14} />}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
