"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import {
  ArrowRight,
  Shield,
  Zap,
  Layers,
  GitMerge,
  CheckCircle2,
} from "lucide-react";

const FEATURES = [
  {
    icon: Layers,
    title: "Unified Workspace",
    description:
      "Jira tasks, Google Calendar, Slack threads, and contracts — all in one view.",
  },
  {
    icon: GitMerge,
    title: "Four Chambers",
    description:
      "Every workflow follows Discover, Build, Review, Ship. One model for every department.",
  },
  {
    icon: Shield,
    title: "Role-Based Control",
    description:
      "Builders create. Gatekeepers review. Owners ship. Separation of duties, enforced.",
  },
  {
    icon: Zap,
    title: "AI-Powered Engines",
    description:
      "Otto AI assistant, contract extraction, CRM enrichment — plug in what you need.",
  },
];

const STEPS = [
  {
    number: "1",
    label: "Create workspace",
    detail: "Name it, pick your industry",
  },
  {
    number: "2",
    label: "Choose modules",
    detail: "Contracts, CRM, Tasks, Calendar, Docs",
  },
  {
    number: "3",
    label: "Connect tools",
    detail: "Jira, Google Workspace, Slack",
  },
  { number: "4", label: "Invite team", detail: "Add members, assign roles" },
  { number: "5", label: "Start working", detail: "Your data syncs in seconds" },
];

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  function handleGetStarted() {
    if (user) {
      router.push("/onboarding");
    } else {
      router.push("/login?next=/onboarding");
    }
  }

  function handleSignIn() {
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
            <Shield size={18} className="text-accent-primary" />
          </div>
          <span className="text-lg font-bold text-text-primary">Airlock</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => router.push("/contracts/triage")}
              className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/80"
            >
              Go to Workspace
            </button>
          ) : (
            <>
              <button
                onClick={handleSignIn}
                className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Sign In
              </button>
              <button
                onClick={handleGetStarted}
                className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/80"
              >
                Create Workspace
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center lg:pt-24">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-primary/20 bg-accent-primary/5 px-3 py-1">
          <Zap size={12} className="text-accent-primary" />
          <span className="text-xs font-medium text-accent-primary">
            Free shell + paid engines
          </span>
        </div>

        <h1 className="mb-4 text-4xl font-bold leading-tight text-text-primary lg:text-5xl">
          Your entire workflow.
          <br />
          <span className="text-accent-primary">One workspace.</span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-lg text-text-secondary">
          Airlock unifies your tools into a single workspace. Connect Jira,
          Google Workspace, and Slack — then manage contracts, CRM, and tasks
          without switching tabs.
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleGetStarted}
            className="group flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-3 text-base font-semibold text-white transition-all hover:bg-accent-primary/90 hover:shadow-lg hover:shadow-accent-primary/20"
          >
            Create Your Workspace
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("how-it-works");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-lg border border-surface-border px-6 py-3 text-base font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
          >
            See How It Works
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-surface-border bg-surface-raised/50 px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-surface-border bg-surface-raised p-5"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary/10">
                  <feature.icon size={20} className="text-accent-primary" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <p className="text-xs leading-relaxed text-text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-text-primary">
            Zero to production in under 2 hours
          </h2>
          <p className="mb-10 text-center text-sm text-text-secondary">
            Five steps. No engineering required.
          </p>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className="flex items-start gap-4 rounded-lg border border-surface-border bg-surface-raised p-4 transition-colors hover:border-accent-primary/20"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 text-sm font-bold text-accent-primary">
                  {step.number}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {step.label}
                  </p>
                  <p className="text-xs text-text-muted">{step.detail}</p>
                </div>
                <CheckCircle2
                  size={16}
                  className={
                    i === 0 ? "text-accent-success" : "text-surface-border"
                  }
                />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={handleGetStarted}
              className="group inline-flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-primary/90"
            >
              Start Now — It&apos;s Free
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
            <p className="mt-2 text-xs text-text-muted">
              No credit card required. Free tier includes 5 users.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-xs text-text-muted">
            Airlock — Enterprise data operations platform
          </span>
          <span className="text-xs text-text-muted">
            Free shell + paid engines
          </span>
        </div>
      </footer>
    </div>
  );
}
