import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type {
  Notification,
  ToastItem,
  NotificationCategory,
} from "@/lib/mock-notifications";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-notifications";
import { getWorkspaceMode } from "@/stores/onboarding.store";

let toastCounter = 0;

interface NotificationState {
  // Notification center
  notifications: Notification[];
  isOpen: boolean;
  filterCategory: NotificationCategory | "all";

  // Toast queue
  toasts: ToastItem[];

  // Actions — notification center
  open: () => void;
  close: () => void;
  toggle: () => void;
  setFilterCategory: (cat: NotificationCategory | "all") => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  fetchNotifications: () => Promise<void>;

  // Actions — toasts
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;

  // Derived
  unreadCount: () => number;
  filteredNotifications: () => Notification[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isOpen: false,
  filterCategory: "all",
  toasts: [],

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  setFilterCategory: (cat) => set({ filterCategory: cat }),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),

  dismiss: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  fetchNotifications: async () => {
    try {
      const data = await apiFetch<{ notifications: Notification[] }>(
        "/api/v1/notifications",
      );
      set({ notifications: data.notifications });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ notifications: [] });
      } else {
        set({ notifications: [...MOCK_NOTIFICATIONS] });
      }
    }
  },

  addToast: (toast) => {
    const id = `toast_${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));

    // Auto-dismiss after duration
    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  filteredNotifications: () => {
    const { notifications, filterCategory } = get();
    if (filterCategory === "all") return notifications;
    return notifications.filter((n) => n.category === filterCategory);
  },
}));
