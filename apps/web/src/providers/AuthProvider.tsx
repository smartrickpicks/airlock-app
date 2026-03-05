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
    const token = localStorage.getItem("airlock_access_token");
    if (!token) {
      useAuthStore.getState().setUser(null);
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
      });
  }, [setUser, setOrgRole, setAccessToken]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}
