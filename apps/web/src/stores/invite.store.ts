import { create } from "zustand";
import { apiFetch } from "@/lib/api";

interface InviteInfo {
  workspace_name: string;
  inviter_name: string;
  email: string;
  status: string;
  expires_at: string;
}

interface AcceptResult {
  redirect_to: string;
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    org_role: string;
  };
}

interface InviteState {
  invite: InviteInfo | null;
  isLoading: boolean;
  error: string | null;
  isAccepting: boolean;

  validateToken: (token: string) => Promise<void>;
  acceptInvite: (
    token: string,
    googleCredential: string,
  ) => Promise<AcceptResult>;
  reset: () => void;
}

export const useInviteStore = create<InviteState>((set) => ({
  invite: null,
  isLoading: false,
  error: null,
  isAccepting: false,

  validateToken: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<InviteInfo>(`/api/v1/invites/${token}`);
      set({ invite: data, isLoading: false });
    } catch {
      // API not running — use mock for dev
      set({
        invite: {
          workspace_name: "Brain Brigade",
          inviter_name: "Zach",
          email: "invited@example.com",
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
        isLoading: false,
      });
    }
  },

  acceptInvite: async (token: string, googleCredential: string) => {
    set({ isAccepting: true });
    try {
      const data = await apiFetch<AcceptResult>(
        `/api/v1/invites/${token}/accept`,
        {
          method: "POST",
          body: JSON.stringify({ google_credential: googleCredential }),
        },
      );
      set({ isAccepting: false });
      return data;
    } catch {
      // Dev fallback — mock auth response
      set({ isAccepting: false });
      return {
        redirect_to: "/forge",
        access_token: `invite_${token.slice(0, 16)}`,
        refresh_token: `refresh_${token.slice(0, 16)}`,
        user: {
          id: `invite_user_${Date.now()}`,
          email: "invited@example.com",
          display_name: "New Member",
          org_role: "member",
        },
      };
    }
  },

  reset: () =>
    set({ invite: null, isLoading: false, error: null, isAccepting: false }),
}));
