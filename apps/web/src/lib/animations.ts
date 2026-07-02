/**
 * Shared Framer Motion animation variants for Airlock app.
 * Ported from airlock-landing and extended for in-app use.
 *
 * Usage:
 *   import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations'
 *   <motion.div {...fadeInUp}>
 *   <motion.ul variants={staggerContainer} initial="initial" animate="animate">
 */
import type { Variants, Transition } from "framer-motion";
import { useReducedMotion } from "framer-motion";

/**
 * Hook to get animation props that respect reduced-motion preferences.
 * Usage: const motionProps = useMotionSafe(fadeInUp);
 * Returns empty props when reduced-motion is preferred.
 */
export function useMotionSafe(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return {};
  return props;
}

/* ─── Easing curves ────────────────────────────────────────────────────────── */
export const ease = {
  smooth: [0.4, 0, 0.2, 1] as const,
  spring: [0.175, 0.885, 0.32, 1.275] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
};

/* ─── Base transitions ─────────────────────────────────────────────────────── */
export const springTransition: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
};

export const smoothTransition: Transition = {
  duration: 0.5,
  ease: ease.smooth,
};

/* ─── Fade-in-up (most common entrance) ────────────────────────────────────── */
export const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: ease.smooth },
};

export const fadeInDown = {
  initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: ease.smooth },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.4, ease: ease.smooth },
};

/* ─── Scale entrances ──────────────────────────────────────────────────────── */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.35, ease: ease.spring },
};

export const popIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: springTransition,
};

/* ─── Slide entrances ──────────────────────────────────────────────────────── */
export const slideInLeft = {
  initial: { opacity: 0, x: -32 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5, ease: ease.smooth },
};

export const slideInRight = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5, ease: ease.smooth },
};

/* ─── Stagger containers ───────────────────────────────────────────────────── */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerSlow: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: ease.smooth },
  },
};

export const staggerItemScale: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: ease.spring },
  },
};

/* ─── Page / view transitions ──────────────────────────────────────────────── */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: ease.smooth },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: ease.accelerate },
  },
};

/* ─── Modal / overlay ──────────────────────────────────────────────────────── */
export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: ease.spring },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 4,
    transition: { duration: 0.15, ease: ease.accelerate },
  },
};

/* ─── Sidebar / panel ──────────────────────────────────────────────────────── */
export const sidebarVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: ease.smooth },
  },
};

/* ─── Viewport config (for useInView) ──────────────────────────────────────── */
export const viewportConfig = {
  once: true,
  margin: "-60px" as const,
};

/* ─── Progress bar spring ──────────────────────────────────────────────────── */
export const progressSpring: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 15,
  restDelta: 0.001,
};

/* ─── Wizard step transitions (for AnimatePresence) ────────────────────────── */
export const wizardStep: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: ease.smooth },
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: { duration: 0.25, ease: ease.accelerate },
  },
};

export const wizardStepReverse: Variants = {
  initial: { opacity: 0, x: -40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: ease.smooth },
  },
  exit: {
    opacity: 0,
    x: 40,
    transition: { duration: 0.25, ease: ease.accelerate },
  },
};
