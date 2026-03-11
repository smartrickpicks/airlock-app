"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForgeStore } from "@/stores/forge.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import ForgeCanvas from "@/components/atoms/ForgeCanvas";
import OttoOtterAvatar from "@/components/atoms/OttoOtterAvatar";
import OttoAvatar from "@/components/atoms/OttoAvatar";
import ForgeOnboardingChat from "@/components/organisms/ForgeOnboardingChat";

export default function OnboardingSetupPage() {
  const router = useRouter();
  const { isComplete, inferredProfile, metaArchetype, step, reset, isPowered } =
    useForgeStore();
  const completeAdminItem = useOnboardingStore((s) => s.completeAdminItem);

  // Navigate on launch complete
  useEffect(() => {
    if (isComplete) {
      completeAdminItem("create_workspace");
      completeAdminItem("enable_modules");
      localStorage.setItem("airlock_onboarding_complete", "true");
      const timer = setTimeout(() => router.push("/contracts/triage"), 1200);
      return () => clearTimeout(timer);
    }
  }, [isComplete, completeAdminItem, router]);

  // Reset forge on mount
  useEffect(() => {
    reset();
  }, [reset]);

  const showConstellation = !!inferredProfile;

  // Map meta-archetype to OttoAvatar archetype
  const ottoArchetype =
    metaArchetype === "driver"
      ? ("executor" as const)
      : metaArchetype === "enforcer"
        ? ("guardian" as const)
        : ("connector" as const);

  return (
    <ForgeCanvas isPowered={isPowered}>
      <div className="flex min-h-screen">
        {/* Left: Chat panel */}
        <div className="flex flex-1 flex-col max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-border/30">
            <OttoOtterAvatar size="sm" state={step < 4 ? "idle" : "active"} />
            <div>
              <h1 className="text-sm font-bold text-text-primary">
                Workspace Forge
              </h1>
              <p className="text-[10px] text-text-muted">
                Otto is configuring your workspace
              </p>
            </div>

            {/* Step indicator */}
            <div className="ml-auto flex gap-1">
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    s <= step
                      ? "w-6 bg-accent-primary"
                      : "w-2 bg-surface-border/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1">
            <ForgeOnboardingChat />
          </div>
        </div>

        {/* Right: Avatar panel (desktop only) */}
        <div className="hidden lg:flex lg:w-80 items-center justify-center border-l border-surface-border/20">
          <AnimatePresence mode="wait">
            {showConstellation ? (
              <motion.div
                key="constellation"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <OttoAvatar
                  size="lg"
                  archetype={ottoArchetype}
                  state="active"
                />
                <p className="mt-3 text-xs text-text-muted">
                  {metaArchetype
                    ? `${metaArchetype.charAt(0).toUpperCase()}${metaArchetype.slice(1)} Mode`
                    : ""}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="otter"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
              >
                <OttoOtterAvatar size="xl" state="idle" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ForgeCanvas>
  );
}
