"use client";

import { useRouter } from "next/navigation";
import SetupWizard from "@/components/templates/SetupWizard";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <SetupWizard
      onComplete={() => {
        router.push("/");
      }}
    />
  );
}
