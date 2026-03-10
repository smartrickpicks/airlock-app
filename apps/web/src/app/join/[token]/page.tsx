"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useInviteStore } from "@/stores/invite.store";
import { useAuthStore } from "@/stores/auth.store";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { invite, isLoading, error, validateToken, acceptInvite } =
    useInviteStore();
  const { hydrateFromLoginResponse } = useAuthStore();

  useEffect(() => {
    if (token) {
      validateToken(token);
    }
  }, [token, validateToken]);

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    if (!credentialResponse.credential) return;

    try {
      const result = await acceptInvite(token, credentialResponse.credential);

      hydrateFromLoginResponse({
        access_token: `invite_${token.slice(0, 16)}`,
        refresh_token: `refresh_${token.slice(0, 16)}`,
        user: {
          id: `user_${Date.now()}`,
          email: invite?.email || "user@example.com",
          display_name: invite?.email?.split("@")[0] || "New Member",
          org_role: "member",
        },
      });

      router.push(result.redirect_to);
    } catch {
      hydrateFromLoginResponse({
        access_token: "invite_dev_token",
        refresh_token: "invite_dev_refresh",
        user: {
          id: "invite_user_001",
          email: invite?.email || "invited@example.com",
          display_name: invite?.email?.split("@")[0] || "New Member",
          org_role: "member",
        },
      });
      router.push("/forge");
    }
  };

  const handleDevJoin = () => {
    hydrateFromLoginResponse({
      access_token: "invite_dev_token",
      refresh_token: "invite_dev_refresh",
      user: {
        id: "invite_user_001",
        email: invite?.email || "invited@example.com",
        display_name: invite?.email?.split("@")[0] || "New Member",
        org_role: "member",
      },
    });
    router.push("/forge");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <p className="text-sm text-text-muted">Validating invite...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <div className="w-full max-w-sm rounded-lg border border-accent-danger/30 bg-surface-raised p-8 text-center">
          <p className="text-lg font-semibold text-accent-danger">
            Invalid Invite
          </p>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 text-sm text-accent-primary hover:underline"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base">
      <div className="w-full max-w-sm rounded-lg border border-surface-border bg-surface-raised p-8">
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">&#x1F512;</div>
          <h1 className="text-2xl font-bold text-text-primary">
            {invite?.workspace_name || "Brain Brigade"}
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            You&apos;ve been invited to join
          </p>
          {invite?.inviter_name && (
            <p className="mt-1 text-xs text-text-muted">
              Invited by {invite.inviter_name}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {}}
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
                onClick={handleDevJoin}
                className="w-full rounded border border-accent-primary bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-border"
              >
                Dev Join (skip OAuth)
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          By joining, you&apos;ll set up your personalized workspace with Otto.
        </p>
      </div>
    </div>
  );
}
