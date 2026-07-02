"use client";

import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useAuthStore } from "@/stores/auth.store";
import { apiFetch } from "@/lib/api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, setOrgRole, setAccessToken } = useAuthStore();

  useEffect(() => {
    let token = localStorage.getItem("airlock_access_token");

    if (!token) {
      useAuthStore.getState().setUser(null);
      // Redirect to login if not on a public route
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/landing") &&
        window.location.pathname !== "/"
      ) {
        window.location.href = "/login";
      }
      return;
    }

    // Dev mock token — skip API validation, use stored state
    if (token === "dev_mock_token") {
      const state = useAuthStore.getState();
      if (!state.user) {
        setUser({
          id: "dev_user_001",
          email: "dev@airlock.local",
          name: "Dev User",
        });
        setOrgRole("executive");
        setAccessToken(token);
      }
      return;
    }

    apiFetch<{
      user_id: string;
      email: string;
      workspace_id: string;
      org_role: string;
    }>("/api/v1/auth/me")
      .then((data) => {
        setUser({ id: data.user_id, email: data.email, name: data.email });
        setOrgRole(
          data.org_role as "member" | "lead" | "director" | "executive",
        );
        setAccessToken(token);
      })
      .catch(() => {
        localStorage.removeItem("airlock_access_token");
        localStorage.removeItem("airlock_refresh_token");
        useAuthStore.getState().setUser(null);
        // Redirect to login on auth failure
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          window.location.href = "/login";
        }
      });
  }, [setUser, setOrgRole, setAccessToken]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}
