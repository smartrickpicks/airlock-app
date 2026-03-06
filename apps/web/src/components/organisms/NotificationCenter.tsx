"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/stores/notification.store";
import {
  NOTIFICATION_TYPE_CONFIG,
  NOTIFICATION_CATEGORY_CONFIG,
  type NotificationCategory,
} from "@/lib/mock-notifications";

const CATEGORY_FILTERS: {
  value: NotificationCategory | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "contract", label: "Contracts" },
  { value: "crm", label: "CRM" },
  { value: "calendar", label: "Calendar" },
  { value: "document", label: "Docs" },
  { value: "system", label: "System" },
];

export default function NotificationCenter() {
  const router = useRouter();
  const {
    isOpen,
    close,
    filterCategory,
    setFilterCategory,
    markRead,
    markAllRead,
    dismiss,
    fetchNotifications,
    unreadCount,
    filteredNotifications,
  } = useNotificationStore();

  // Load notifications on first open
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const items = filteredNotifications();
  const count = unreadCount();

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[var(--z-overlay)]" onClick={close} />

      {/* Panel — slides in from right */}
      <div className="fixed right-0 top-0 z-[var(--z-modal)] h-full w-full max-w-md border-l border-surface-border bg-surface-raised shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Notifications
            </h2>
            {count > 0 && (
              <span className="rounded-full bg-accent-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-medium text-accent-primary hover:text-accent-primary-hover transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={close}
              className="rounded px-2 py-0.5 text-xs text-text-muted hover:text-text-primary bg-surface-overlay transition-colors"
            >
              ESC
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-surface-border px-4 py-2">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterCategory(f.value)}
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                filterCategory === f.value
                  ? "bg-accent-primary/15 text-accent-primary"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-overlay"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <p className="text-sm">No notifications</p>
              <p className="mt-1 text-xs">You&apos;re all caught up</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {items.map((n) => {
                const typeCfg = NOTIFICATION_TYPE_CONFIG[n.type];
                const catCfg = NOTIFICATION_CATEGORY_CONFIG[n.category];

                return (
                  <div
                    key={n.id}
                    className={`group relative flex gap-3 px-4 py-3 transition-colors hover:bg-surface-overlay/50 ${
                      !n.read ? "bg-surface-overlay/20" : ""
                    }`}
                  >
                    {/* Unread dot */}
                    {!n.read && (
                      <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-accent-primary" />
                    )}

                    {/* Type icon */}
                    <span
                      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${typeCfg.color} ${typeCfg.bgColor}`}
                    >
                      {typeCfg.icon}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium truncate ${
                            n.read ? "text-text-secondary" : "text-text-primary"
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="flex-shrink-0 text-[10px] text-text-muted">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                        {n.body}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-overlay text-text-muted">
                          {catCfg.icon} {catCfg.label}
                        </span>
                        {n.href && (
                          <button
                            onClick={() => {
                              markRead(n.id);
                              router.push(n.href!);
                              close();
                            }}
                            className="text-[10px] font-medium text-accent-primary hover:text-accent-primary-hover transition-colors"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dismiss button */}
                    <button
                      onClick={() => dismiss(n.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all text-xs mt-0.5"
                      aria-label="Dismiss notification"
                    >
                      \u2715
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border px-4 py-2 text-center">
          <span className="text-[10px] text-text-muted">
            {items.length} notification{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </>
  );
}
