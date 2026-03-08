import { create } from "zustand";

type OrgRole = "architect" | "executive" | "director" | "lead" | "member";
type ModuleRole = "builder" | "gatekeeper" | "owner" | "designer" | "viewer";

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface LoginResponse {
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

interface AuthState {
  /** Current authenticated user */
  user: User | null;
  /** Organization-level role */
  orgRole: OrgRole | null;
  /** Per-module role assignments */
  moduleRoles: Record<string, ModuleRole>;
  /** JWT access token */
  accessToken: string | null;
  /** Whether auth state is loading */
  isLoading: boolean;

  /** Set the authenticated user */
  setUser: (user: User | null) => void;
  /** Set org role */
  setOrgRole: (role: OrgRole | null) => void;
  /** Set a module-specific role */
  setModuleRole: (module: string, role: ModuleRole) => void;
  /** Set the access token */
  setAccessToken: (token: string | null) => void;
  /** Hydrate store from login API response */
  hydrateFromLoginResponse: (response: LoginResponse) => void;
  /** Clear all auth state (logout) */
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  orgRole: null,
  moduleRoles: {},
  accessToken: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setOrgRole: (role) => set({ orgRole: role }),
  setModuleRole: (module, role) =>
    set((state) => ({
      moduleRoles: { ...state.moduleRoles, [module]: role },
    })),
  setAccessToken: (token) => set({ accessToken: token }),

  hydrateFromLoginResponse: (response) => {
    // Save tokens to localStorage
    localStorage.setItem("airlock_access_token", response.access_token);
    localStorage.setItem("airlock_refresh_token", response.refresh_token);

    // Set cookie for middleware auth checks
    document.cookie = `airlock_access_token=${response.access_token}; path=/; max-age=900; SameSite=Lax`;

    // Update store state
    set({
      user: {
        id: response.user.id,
        email: response.user.email,
        name: response.user.display_name,
        avatarUrl: response.user.avatar_url,
      },
      orgRole: response.user.org_role as OrgRole,
      accessToken: response.access_token,
      isLoading: false,
    });
  },

  logout: () => {
    // Clear localStorage
    localStorage.removeItem("airlock_access_token");
    localStorage.removeItem("airlock_refresh_token");

    // Clear cookie
    document.cookie = "airlock_access_token=; path=/; max-age=0; SameSite=Lax";

    // Reset store state
    set({
      user: null,
      orgRole: null,
      moduleRoles: {},
      accessToken: null,
      isLoading: false,
    });
  },
}));
