"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { apiFetch } from "@/lib/api";

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrateFromLoginResponse } = useAuthStore();

  const DEFAULT_AUTHENTICATED_ROUTE = "/contracts/triage";
  const rawNext = searchParams.get("next");
  const nextUrl =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : DEFAULT_AUTHENTICATED_ROUTE;

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    if (!credentialResponse.credential) return;

    try {
      const data = await apiFetch<AuthResponse>("/api/v1/auth/google/verify", {
        method: "POST",
        body: JSON.stringify({
          credential: credentialResponse.credential,
          workspace_id: "ws_default",
        }),
      });

      hydrateFromLoginResponse(data);
      useOnboardingStore.getState().completeChecklistItem("login");
      router.push(nextUrl);
    } catch {
      // Login failed — Google login error is shown inline
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
    <div className="flex min-h-screen items-center justify-center bg-surface-base">
      <div className="w-full max-w-sm rounded-lg border border-surface-border bg-surface-raised p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary">Airlock</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {nextUrl.includes("onboarding")
              ? "Sign in to create your workspace"
              : "Enterprise data operations platform"}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              // Google login error
            }}
            theme="filled_black"
            size="large"
            width="320"
          />

          {process.env.NODE_ENV === "development" && (
            <>
              <div className="flex w-full items-center gap-3">
                <div className="h-px flex-1 bg-surface-border" />
                <span className="text-xs text-text-muted">DEV ONLY</span>
                <div className="h-px flex-1 bg-surface-border" />
              </div>
              <button
                onClick={handleDevLogin}
                className="w-full rounded border border-accent-primary bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-border"
              >
                Dev Login
              </button>
              <button
                onClick={handleCreateWorkspace}
                className="w-full rounded border border-accent-success bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-border"
              >
                Create Workspace
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-text-muted transition-colors hover:text-text-secondary"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-base">
          <div className="text-sm text-text-muted">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
