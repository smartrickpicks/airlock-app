"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base">
      {/* Logo */}
      <h1 className="font-mono text-4xl font-bold tracking-widest text-text-primary">
        AIRLOCK
      </h1>

      {/* Tagline */}
      <p className="mt-3 text-sm text-text-secondary">
        Enterprise data operations, orchestrated.
      </p>

      {/* CTA */}
      <button
        onClick={() => router.push("/onboarding")}
        className="mt-10 rounded-full bg-accent-primary px-8 py-3 text-sm font-semibold text-surface-base transition-colors hover:bg-accent-primary-hover"
      >
        Create Workspace
      </button>

      {/* Sign in link (placeholder) */}
      <p className="mt-6 text-xs text-text-muted">
        Already have a workspace?{" "}
        <button className="text-text-secondary underline underline-offset-2 transition-colors hover:text-text-primary">
          Sign in
        </button>
      </p>
    </div>
  );
}
