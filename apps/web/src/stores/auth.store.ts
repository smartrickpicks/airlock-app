import { create } from "zustand";

type OrgRole = "member" | "lead" | "director" | "executive";
type ModuleRole = "builder" | "gatekeeper" | "owner" | "designer" | "viewer";

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
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
  logout: () =>
    set({
      user: null,
      orgRole: null,
      moduleRoles: {},
      accessToken: null,
      isLoading: false,
    }),
}));
