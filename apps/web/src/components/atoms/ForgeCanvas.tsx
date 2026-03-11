"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface ForgeCanvasProps {
  children: React.ReactNode;
  showGrid?: boolean;
  isPowered?: boolean;
  className?: string;
}

export default function ForgeCanvas({
  children,
  showGrid = true,
  isPowered = true,
  className = "",
}: ForgeCanvasProps) {
  // Track previous isPowered to detect the transition to true
  const prevPoweredRef = useRef(isPowered);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (!prevPoweredRef.current && isPowered) {
      // isPowered just became true — trigger a new pulse ring
      setPulseKey((k) => k + 1);
    }
    prevPoweredRef.current = isPowered;
  }, [isPowered]);

  return (
    <div
      className={`relative min-h-screen bg-surface-base overflow-hidden ${className}`}
    >
      {/* === Dot grid === */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-[2000ms]"
          style={{
            opacity: isPowered ? 1 : 0.15,
            backgroundImage:
              "radial-gradient(circle, rgba(124,92,252,0.12) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      )}

      {/* === Ambient orbs (visible only when powered) === */}
      <AnimatePresence>
        {isPowered && (
          <>
            {/* Top-left orb */}
            <motion.div
              key="orb-tl"
              className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent-primary/8 animate-airlock-glow-breathe pointer-events-none"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
            {/* Bottom-right orb */}
            <motion.div
              key="orb-br"
              className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent-secondary/6 animate-airlock-drift pointer-events-none"
              style={{ animationDelay: "2s" }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 2, ease: "easeOut", delay: 0.2 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* === Power-up pulse ring (plays once when isPowered becomes true) === */}
      <AnimatePresence>
        {isPowered && pulseKey > 0 && (
          <motion.div
            key={`pulse-${pulseKey}`}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 5 }}
          >
            <motion.div
              className="rounded-full border-2 border-accent-primary/40"
              initial={{ width: 0, height: 0, opacity: 1 }}
              animate={{
                width: "200vw",
                height: "200vw",
                opacity: 0,
              }}
              transition={{
                width: { duration: 1.5, ease: "easeOut" },
                height: { duration: 1.5, ease: "easeOut" },
                opacity: { duration: 2, delay: 0.5, ease: "easeOut" },
              }}
              onAnimationComplete={() => {
                // nothing — AnimatePresence handles unmount
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Content wrapper === */}
      <div
        className={`relative z-10 transition-all duration-[2000ms] ${
          !isPowered ? "saturate-[0.3] brightness-50" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
