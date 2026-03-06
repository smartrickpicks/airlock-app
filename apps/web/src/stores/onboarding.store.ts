import { create } from "zustand";
import type {
  OnboardingPhase,
  WizardStep,
  IndustryOption,
  DataSourceType,
  UserChecklistItemId,
  AdminChecklistItemId,
  ChecklistItem,
  InviteeEntry,
  WorkspaceSetupState,
} from "@/lib/mock-onboarding";
import {
  USER_CHECKLIST_ITEMS,
  ADMIN_CHECKLIST_ITEMS,
  MODULE_OPTIONS,
} from "@/lib/mock-onboarding";

const LS_KEY_USER_CHECKLIST = "airlock_user_checklist";
const LS_KEY_ONBOARDING_PHASE = "airlock_onboarding_phase";
const LS_KEY_WELCOME_SEEN = "airlock_welcome_seen";
const LS_KEY_CHECKLIST_DISMISSED = "airlock_checklist_dismissed";

function loadFromLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToLS(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — ignore */
  }
}

interface OnboardingState {
  /* phase */
  phase: OnboardingPhase;
  setPhase: (phase: OnboardingPhase) => void;

  /* welcome modal */
  welcomeSeen: boolean;
  markWelcomeSeen: () => void;

  /* user checklist */
  userChecklist: ChecklistItem<UserChecklistItemId>[];
  completeChecklistItem: (id: UserChecklistItemId) => void;
  checklistDismissed: boolean;
  dismissChecklist: () => void;

  /* admin checklist */
  adminChecklist: ChecklistItem<AdminChecklistItemId>[];
  completeAdminItem: (id: AdminChecklistItemId) => void;

  /* wizard state */
  wizardStep: WizardStep;
  setupState: WorkspaceSetupState;
  setWizardStep: (step: WizardStep) => void;
  setWorkspaceName: (name: string) => void;
  setIndustry: (industry: IndustryOption) => void;
  toggleModule: (moduleId: string) => void;
  addInvitee: (entry: InviteeEntry) => void;
  removeInvitee: (index: number) => void;
  setDataSource: (source: DataSourceType | null) => void;
  setLoadDemoData: (load: boolean) => void;
  resetWizard: () => void;

  /* derived */
  userChecklistProgress: () => { completed: number; total: number };
  adminChecklistProgress: () => { completed: number; total: number };
  isOnboardingComplete: () => boolean;
}

const defaultSetupState: WorkspaceSetupState = {
  workspaceName: "",
  industry: "",
  enabledModules: MODULE_OPTIONS.filter((m) => m.defaultEnabled).map(
    (m) => m.id,
  ),
  invitees: [],
  dataSource: null,
  loadDemoData: false,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  phase: loadFromLS<OnboardingPhase>(LS_KEY_ONBOARDING_PHASE, "day1"),
  welcomeSeen: loadFromLS<boolean>(LS_KEY_WELCOME_SEEN, false),
  userChecklist: loadFromLS<ChecklistItem<UserChecklistItemId>[]>(
    LS_KEY_USER_CHECKLIST,
    USER_CHECKLIST_ITEMS,
  ),
  checklistDismissed: loadFromLS<boolean>(LS_KEY_CHECKLIST_DISMISSED, false),
  adminChecklist: [...ADMIN_CHECKLIST_ITEMS],
  wizardStep: "create_workspace",
  setupState: { ...defaultSetupState },

  setPhase: (phase) => {
    set({ phase });
    saveToLS(LS_KEY_ONBOARDING_PHASE, phase);
  },

  markWelcomeSeen: () => {
    set({ welcomeSeen: true });
    saveToLS(LS_KEY_WELCOME_SEEN, true);
  },

  completeChecklistItem: (id) => {
    const updated = get().userChecklist.map((item) =>
      item.id === id ? { ...item, completed: true } : item,
    );
    set({ userChecklist: updated });
    saveToLS(LS_KEY_USER_CHECKLIST, updated);
  },

  dismissChecklist: () => {
    set({ checklistDismissed: true });
    saveToLS(LS_KEY_CHECKLIST_DISMISSED, true);
  },

  completeAdminItem: (id) => {
    set({
      adminChecklist: get().adminChecklist.map((item) =>
        item.id === id ? { ...item, completed: true } : item,
      ),
    });
  },

  setWizardStep: (step) => set({ wizardStep: step }),

  setWorkspaceName: (name) =>
    set({ setupState: { ...get().setupState, workspaceName: name } }),

  setIndustry: (industry) =>
    set({ setupState: { ...get().setupState, industry } }),

  toggleModule: (moduleId) => {
    const current = get().setupState.enabledModules;
    const updated = current.includes(moduleId)
      ? current.filter((m) => m !== moduleId)
      : [...current, moduleId];
    set({ setupState: { ...get().setupState, enabledModules: updated } });
  },

  addInvitee: (entry) =>
    set({
      setupState: {
        ...get().setupState,
        invitees: [...get().setupState.invitees, entry],
      },
    }),

  removeInvitee: (index) =>
    set({
      setupState: {
        ...get().setupState,
        invitees: get().setupState.invitees.filter((_, i) => i !== index),
      },
    }),

  setDataSource: (source) =>
    set({ setupState: { ...get().setupState, dataSource: source } }),

  setLoadDemoData: (load) =>
    set({ setupState: { ...get().setupState, loadDemoData: load } }),

  resetWizard: () =>
    set({
      wizardStep: "create_workspace",
      setupState: { ...defaultSetupState },
    }),

  userChecklistProgress: () => {
    const list = get().userChecklist;
    return {
      completed: list.filter((i) => i.completed).length,
      total: list.length,
    };
  },

  adminChecklistProgress: () => {
    const list = get().adminChecklist;
    return {
      completed: list.filter((i) => i.completed).length,
      total: list.length,
    };
  },

  isOnboardingComplete: () => get().userChecklist.every((i) => i.completed),
}));
