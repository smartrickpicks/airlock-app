"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

function provisionDevAuth() {
  const token = "dev_mock_token";
  localStorage.setItem("airlock_access_token", token);
  document.cookie = `airlock_access_token=${token}; path=/; max-age=86400; SameSite=Lax`;

  const { setUser, setOrgRole, setAccessToken } = useAuthStore.getState();
  setUser({ id: "dev_user_001", email: "dev@airlock.local", name: "Dev User" });
  setOrgRole("executive");
  setAccessToken(token);
}

/**
 * Auth passthrough — provisions dev session, redirects to workspace wizard.
 * If onboarding is already complete, redirects to home.
 * Future: Google OAuth callback handler.
 */
export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    provisionDevAuth();

    // Skip onboarding if already completed
    if (localStorage.getItem("airlock_onboarding_complete") === "true") {
      router.replace("/");
      return;
    }

    router.replace("/onboarding/setup");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base">
      <p className="text-sm text-text-muted">Loading workspace...</p>
    </div>
  );
}
