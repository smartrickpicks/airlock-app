"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { ApiError, apiFetch } from "@/lib/api";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
    org_role: string;
  };
}

interface AuthConfigResponse {
  google_client_id: string;
  configured: boolean;
}

function formatLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Google sign-in was rejected by the API. Check that GOOGLE_CLIENT_ID on the API matches NEXT_PUBLIC_GOOGLE_CLIENT_ID on the web app.";
    }

    if (error.status === 503) {
      return "Google sign-in is unavailable right now. Verify the API has GOOGLE_CLIENT_ID configured and can reach Google's token verification endpoint.";
    }

    if (error.status >= 500) {
      return "The app could not complete /api/v1/auth/google/verify. On Railway, confirm NEXT_PUBLIC_API_URL points to the API service instead of the default http://127.0.0.1:8000.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Google sign-in failed for an unknown reason.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrateFromLoginResponse } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authConfigReady, setAuthConfigReady] = useState(false);

  const DEFAULT_AUTHENTICATED_ROUTE = "/contracts/triage";
  const rawNext = searchParams.get("next");
  const nextUrl =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : DEFAULT_AUTHENTICATED_ROUTE;

  useEffect(() => {
    let cancelled = false;

    apiFetch<AuthConfigResponse>("/api/v1/auth/config")
      .then((data) => {
        if (cancelled) return;
        if (!data.configured) {
          setAuthError(
            "Google OAuth is not configured on the API. Set GOOGLE_CLIENT_ID on the backend service.",
          );
          return;
        }
        setAuthConfigReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setAuthError(formatLoginError(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    if (!credentialResponse.credential) return;

    try {
      setAuthError(null);
      const data = await apiFetch<AuthResponse>("/api/v1/auth/google/verify", {
        method: "POST",
        body: JSON.stringify({
          credential: credentialResponse.credential,
          workspace_id: "ws_default",
        }),
      });

      hydrateFromLoginResponse(data);
      useOnboardingStore.getState().completeChecklistItem("login");

      // First-time user (no workspace) → onboarding
      if (data.user.org_role === "member") {
        router.push("/onboarding/setup");
        return;
      }
      router.push(nextUrl);
    } catch (error) {
      setAuthError(formatLoginError(error));
    }
  };

  const handleDevLogin = async () => {
    useOnboardingStore.getState().setWorkspaceMode("demo");
    try {
      const data = await apiFetch<AuthResponse>("/api/v1/auth/dev/login", {
        method: "POST",
      });

      hydrateFromLoginResponse(data);
      router.push(nextUrl);
    } catch {
      // API not running — use client-side mock for dev preview
      const mockResponse: AuthResponse = {
        access_token: "dev_mock_token",
        refresh_token: "dev_mock_refresh",
        user: {
          id: "dev_user_001",
          email: "dev@airlock.local",
          display_name: "Dev User",
          org_role: "executive",
        },
      };
      hydrateFromLoginResponse(mockResponse);
      useOnboardingStore.getState().completeChecklistItem("login");
      router.push(nextUrl);
    }
  };

  const handleCreateWorkspace = () => {
    // Set clean workspace mode — no mock data
    useOnboardingStore.getState().setWorkspaceMode("clean");

    // Bypass auth with a clean dev user
    const mockResponse: AuthResponse = {
      access_token: "dev_clean_token",
      refresh_token: "dev_clean_refresh",
      user: {
        id: "clean_user_001",
        email: "workspace@airlock.local",
        display_name: "Workspace Admin",
        org_role: "executive",
      },
    };
    hydrateFromLoginResponse(mockResponse);

    // Go to setup wizard
    router.push("/onboarding/setup");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-base overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent-primary/10 animate-airlock-glow-breathe"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full bg-accent-secondary/8 animate-airlock-drift"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-chamber-review/5 animate-airlock-glow-breathe"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />

      {/* Login card */}
      <motion.div
        className="relative w-full max-w-sm rounded-xl border border-surface-border/80 bg-surface-raised/90 backdrop-blur-xl p-8 shadow-2xl shadow-black/40"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo / brand */}
        <motion.div className="mb-8 text-center" {...fadeIn}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary/10 border border-accent-primary/20">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="text-accent-primary"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text">Airlock</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {nextUrl.includes("onboarding")
              ? "Sign in to create your workspace"
              : "Enterprise data operations platform"}
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            {authConfigReady ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setAuthError(
                    "Google sign-in was interrupted before the credential reached the API.",
                  );
                }}
                theme="filled_black"
                size="large"
                width="320"
              />
            ) : (
              <div className="flex h-10 w-[320px] items-center justify-center rounded-md border border-surface-border bg-surface-overlay px-4 text-xs text-text-muted">
                {authError
                  ? "Google sign-in unavailable"
                  : "Checking Google sign-in..."}
              </div>
            )}
          </motion.div>

          {authError ? (
            <motion.p
              className="w-full rounded-lg border border-accent-warning/30 bg-accent-warning/10 px-3 py-2 text-xs leading-5 text-text-secondary"
              variants={staggerItem}
            >
              {authError}
            </motion.p>
          ) : null}

          {process.env.NODE_ENV === "development" && (
            <>
              <motion.div
                className="flex w-full items-center gap-3"
                variants={staggerItem}
              >
                <div className="h-px flex-1 bg-surface-border" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  Dev Only
                </span>
                <div className="h-px flex-1 bg-surface-border" />
              </motion.div>
              <motion.button
                onClick={handleDevLogin}
                className="w-full rounded-lg border border-accent-primary/30 bg-surface-overlay px-4 py-2.5 text-sm font-medium text-text-primary transition-all duration-normal hover:bg-accent-primary/10 hover:border-accent-primary/50 hover:shadow-[0_0_20px_rgba(0,209,255,0.08)]"
                variants={staggerItem}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                Dev Login
              </motion.button>
              <motion.button
                onClick={handleCreateWorkspace}
                className="w-full rounded-lg border border-accent-success/30 bg-surface-overlay px-4 py-2.5 text-sm font-medium text-text-primary transition-all duration-normal hover:bg-accent-success/10 hover:border-accent-success/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.08)]"
                variants={staggerItem}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                Create Workspace
              </motion.button>
            </>
          )}
        </motion.div>

        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <button
            onClick={() => router.push("/")}
            className="text-xs text-text-muted transition-colors hover:text-text-secondary"
          >
            Back to home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-base">
          <div className="w-full max-w-sm space-y-4 px-8">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-surface-border/50 animate-airlock-pulse-glow" />
            <div className="mx-auto h-6 w-32 rounded-md bg-surface-border/50 animate-airlock-pulse-glow" />
            <div
              className="mx-auto h-4 w-48 rounded-md bg-surface-border/30 animate-airlock-pulse-glow"
              style={{ animationDelay: "0.1s" }}
            />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
