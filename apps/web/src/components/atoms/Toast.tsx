"use client";

import { useEffect, useState } from "react";
import type { ToastItem } from "@/lib/mock-notifications";
import { NOTIFICATION_TYPE_CONFIG } from "@/lib/mock-notifications";
import { useNotificationStore } from "@/stores/notification.store";

export default function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts);

  return (
    <div className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const removeToast = useNotificationStore((s) => s.removeToast);
  const cfg = NOTIFICATION_TYPE_CONFIG[toast.type];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => removeToast(toast.id), 150);
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-surface-border ${cfg.bgColor} bg-surface-raised px-4 py-3 shadow-lg transition-all duration-150 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      style={{ minWidth: 320, maxWidth: 420 }}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${cfg.color} ${cfg.bgColor}`}
      >
        {cfg.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{toast.title}</p>
        {toast.body && (
          <p className="mt-0.5 text-xs text-text-secondary truncate">
            {toast.body}
          </p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors text-xs"
        aria-label="Dismiss"
      >
        \u2715
      </button>
    </div>
  );
}
