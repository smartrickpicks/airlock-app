"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SetupWizard from "@/components/templates/SetupWizard";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("airlock_onboarding_complete") === "true") {
      router.replace("/");
    }
  }, [router]);

  return (
    <SetupWizard
      onComplete={() => {
        localStorage.setItem("airlock_onboarding_complete", "true");
        router.push("/admin");
      }}
    />
  );
}
