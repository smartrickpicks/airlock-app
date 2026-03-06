"use client";

import { useState } from "react";
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
      setCurrentSlide((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-surface-border bg-surface-overlay shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center px-8 pb-6 pt-10 text-center">
          {/* Icon */}
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary/10">
            <Icon size={32} className="text-accent-primary" />
          </div>

          {/* Title */}
          <h2 className="mb-2 text-lg font-bold text-text-primary">
            {slide.title}
          </h2>

          {/* Description */}
          <p className="mb-8 text-sm leading-relaxed text-text-secondary">
            {slide.description}
          </p>

          {/* Dots */}
          <div className="mb-6 flex gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentSlide
                    ? "w-6 bg-accent-primary"
                    : "w-1.5 bg-surface-border"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex w-full items-center justify-between">
            <button
              onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
              disabled={currentSlide === 0}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover disabled:invisible"
            >
              <ChevronLeft size={14} />
              Back
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/80"
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
