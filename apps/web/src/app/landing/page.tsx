"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, BarChart3, Layers } from "lucide-react";
import {
  fadeInUp,
  fadeIn,
  staggerContainer,
  staggerItem,
  staggerContainerSlow,
} from "@/lib/animations";

const FEATURES = [
  {
    icon: Shield,
    title: "Vault-based workflows",
    desc: "Every contract lives in a vault that moves through chambers — Discover, Build, Review, Ship.",
    color: "text-chamber-discover",
    bg: "bg-chamber-discover/10",
  },
  {
    icon: Zap,
    title: "AI-powered extraction",
    desc: "Otto reads contracts, extracts data, and flags issues before your team ever touches them.",
    color: "text-accent-primary",
    bg: "bg-accent-primary/10",
  },
  {
    icon: BarChart3,
    title: "Triage board",
    desc: "Kanban-style project management built for contract operations. See everything at a glance.",
    color: "text-chamber-build",
    bg: "bg-chamber-build/10",
  },
  {
    icon: Layers,
    title: "Triptych layout",
    desc: "Signal, Orchestrate, Control — three panels that adapt to your role and current task.",
    color: "text-chamber-review",
    bg: "bg-chamber-review/10",
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-surface-base overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Orbs */}
        <div className="absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-accent-primary/6 animate-airlock-glow-breathe" />
        <div
          className="absolute -bottom-64 -right-64 h-[700px] w-[700px] rounded-full bg-accent-secondary/5 animate-airlock-drift"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/3 left-2/3 h-80 w-80 rounded-full bg-chamber-review/4 animate-airlock-glow-breathe"
          style={{ animationDelay: "1.5s" }}
        />
        {/* Grid */}
        <div className="absolute inset-0 bg-grid opacity-30" />
      </div>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        {/* Badge */}
        <motion.div
          className="mb-6 rounded-full border border-accent-primary/20 bg-accent-primary/5 px-4 py-1.5"
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
        >
          <span className="text-xs font-medium text-accent-primary">
            Enterprise Contract Operations
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl"
          {...fadeInUp}
        >
          <span className="text-text-primary">Data operations,</span>
          <br />
          <span className="gradient-text">orchestrated.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-6 max-w-lg text-lg text-text-secondary"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          Airlock turns messy contract data into structured, auditable records —
          powered by AI, governed by your team.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <motion.button
            onClick={() => router.push("/onboarding")}
            className="group flex items-center gap-2 rounded-full bg-accent-primary px-8 py-3.5 text-sm font-semibold text-surface-base transition-all hover:bg-accent-primary-hover hover:shadow-[0_0_40px_rgba(0,209,255,0.2)]"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            Create Workspace
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </motion.button>

          <button
            onClick={() => router.push("/login")}
            className="rounded-full border border-surface-border px-8 py-3.5 text-sm font-medium text-text-secondary transition-all hover:border-accent-primary/30 hover:text-text-primary"
          >
            Sign in
          </button>
        </motion.div>

        {/* Chamber lifecycle indicator */}
        <motion.div
          className="mt-16 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {[
            { label: "Discover", color: "bg-chamber-discover" },
            { label: "Build", color: "bg-chamber-build" },
            { label: "Review", color: "bg-chamber-review" },
            { label: "Ship", color: "bg-chamber-ship" },
          ].map((chamber, i) => (
            <div key={chamber.label} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${chamber.color}`} />
              <span className="text-[11px] font-medium text-text-muted">
                {chamber.label}
              </span>
              {i < 3 && <div className="h-px w-4 bg-surface-border" />}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Features grid ─────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-4xl px-4 pb-24">
        <motion.div
          className="grid gap-4 sm:grid-cols-2"
          variants={staggerContainerSlow}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-60px" }}
        >
          {FEATURES.map((feat) => (
            <motion.div
              key={feat.title}
              className="glow-card rounded-xl border border-surface-border bg-surface-raised/80 p-6"
              variants={staggerItem}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty(
                  "--mouse-x",
                  `${e.clientX - rect.left}px`,
                );
                e.currentTarget.style.setProperty(
                  "--mouse-y",
                  `${e.clientY - rect.top}px`,
                );
              }}
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${feat.bg}`}
              >
                <feat.icon size={20} className={feat.color} />
              </div>
              <h3 className="text-sm font-bold text-text-primary">
                {feat.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
