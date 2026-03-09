"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Onboarding entry point — checks auth then redirects to setup wizard.
 * If onboarding is already complete, redirects to home.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Skip onboarding if already completed
    if (localStorage.getItem("airlock_onboarding_complete") === "true") {
      router.replace("/");
      return;
    }

    // No auth — redirect to login with return URL
    if (!user) {
      const token = localStorage.getItem("airlock_access_token");
      if (!token) {
        router.replace("/login?next=/onboarding/setup");
        return;
      }
    }

    router.replace("/onboarding/setup");
  }, [router, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base">
      <p className="text-sm text-text-muted">Loading workspace...</p>
    </div>
  );
}
