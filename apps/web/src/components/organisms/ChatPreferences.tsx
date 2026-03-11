"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface NotificationPrefs {
  toastEnabled: boolean;
  toastOtto: boolean;
  toastPeople: boolean;
  soundEnabled: boolean;
  soundSend: string;
  soundReceive: string;
  soundNotification: string;
  overlayDefault: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  toastEnabled: true,
  toastOtto: true,
  toastPeople: true,
  soundEnabled: true,
  soundSend: "default",
  soundReceive: "default",
  soundNotification: "default",
  overlayDefault: true,
};

interface ChatPreferencesProps {
  onClose: () => void;
}

export default function ChatPreferences({ onClose }: ChatPreferencesProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiFetch<NotificationPrefs>("/api/chat/preferences")
      .then(setPrefs)
      .catch(() => {
        // Use defaults if API unavailable
      });
  }, []);

  const updatePref = async (
    key: keyof NotificationPrefs,
    value: boolean | string,
  ) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setIsSaving(true);
    try {
      await apiFetch("/api/chat/preferences", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      // Keep local state in mock mode
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Back"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-text-primary">
            Chat Preferences
          </h3>
        </div>
        {isSaving && (
          <span className="text-[10px] text-text-tertiary">Saving...</span>
        )}
      </div>

      {/* Settings */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Toast Notifications */}
        <section>
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Toast Notifications
          </h4>
          <div className="space-y-3">
            <Toggle
              label="Enable toast notifications"
              checked={prefs.toastEnabled}
              onChange={(v) => updatePref("toastEnabled", v)}
            />
            <Toggle
              label="Otto messages"
              description="Show toasts for Otto AI replies"
              checked={prefs.toastOtto}
              onChange={(v) => updatePref("toastOtto", v)}
              disabled={!prefs.toastEnabled}
            />
            <Toggle
              label="People messages"
              description="Show toasts for team messages"
              checked={prefs.toastPeople}
              onChange={(v) => updatePref("toastPeople", v)}
              disabled={!prefs.toastEnabled}
            />
          </div>
        </section>

        {/* Sound */}
        <section>
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Sounds
          </h4>
          <div className="space-y-3">
            <Toggle
              label="Enable sounds"
              checked={prefs.soundEnabled}
              onChange={(v) => updatePref("soundEnabled", v)}
            />
          </div>
        </section>

        {/* Overlay */}
        <section>
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Display
          </h4>
          <div className="space-y-3">
            <Toggle
              label="Overlay mode by default"
              description="Open messenger as overlay instead of push panel"
              checked={prefs.overlayDefault}
              onChange={(v) => updatePref("overlayDefault", v)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Toggle Component (inline) ──────────────────────────────────────

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div>
        <div className="text-sm text-text-primary">{label}</div>
        {description && (
          <div className="text-xs text-text-tertiary mt-0.5">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-blue-500" : "bg-surface-raised"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </label>
  );
}
