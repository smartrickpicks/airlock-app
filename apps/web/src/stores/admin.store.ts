import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type {
  UserPreferences,
  WorkspaceMember,
  FeatureFlag,
  FeatureFlagStatus,
  AuditLogEntry,
} from "@/lib/mock-admin";
import {
  DEFAULT_PREFERENCES,
  MOCK_MEMBERS,
  MOCK_FEATURE_FLAGS,
  MOCK_AUDIT_LOG,
} from "@/lib/mock-admin";

interface AdminState {
  // User preferences
  preferences: UserPreferences;
  // Workspace members
  members: WorkspaceMember[];
  // Feature flags
  featureFlags: FeatureFlag[];
  // Audit log
  auditLog: AuditLogEntry[];
  // Loading states
  isLoading: boolean;

  // Actions
  fetchAdmin: () => Promise<void>;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => void;
  toggleFeatureFlag: (flagId: string, status: FeatureFlagStatus) => void;
  updateMemberRole: (
    memberId: string,
    role: WorkspaceMember["orgRole"],
  ) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  preferences: DEFAULT_PREFERENCES,
  members: [],
  featureFlags: [],
  auditLog: [],
  isLoading: false,

  fetchAdmin: async () => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{
        members: WorkspaceMember[];
        featureFlags: FeatureFlag[];
        auditLog: AuditLogEntry[];
      }>("/api/v1/admin");
      set({
        members: data.members,
        featureFlags: data.featureFlags,
        auditLog: data.auditLog,
        isLoading: false,
      });
    } catch {
      // API not available — use mock data
      set({
        members: MOCK_MEMBERS,
        featureFlags: MOCK_FEATURE_FLAGS,
        auditLog: MOCK_AUDIT_LOG,
        isLoading: false,
      });
    }
  },

  updatePreference: (key, value) =>
    set((state) => ({
      preferences: { ...state.preferences, [key]: value },
    })),

  toggleFeatureFlag: (flagId, status) =>
    set((state) => ({
      featureFlags: state.featureFlags.map((f) =>
        f.id === flagId ? { ...f, status } : f,
      ),
    })),

  updateMemberRole: (memberId, role) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId ? { ...m, orgRole: role } : m,
      ),
    })),
}));
