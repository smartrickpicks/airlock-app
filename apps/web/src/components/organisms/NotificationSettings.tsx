"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

interface NotificationPrefs {
  userId: string;
  toastEnabled: boolean;
  toastOtto: boolean;
  toastPeople: boolean;
  soundEnabled: boolean;
  soundSend: string;
  soundReceive: string;
  soundNotification: string;
  overlayDefault: boolean;
}

interface ApiNotificationPrefs {
  user_id: string;
  toast_enabled: boolean;
  toast_otto: boolean;
  toast_people: boolean;
  sound_enabled: boolean;
  sound_send: string;
  sound_receive: string;
  sound_notification: string;
  overlay_default: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  userId: "",
  toastEnabled: true,
  toastOtto: true,
  toastPeople: true,
  soundEnabled: true,
  soundSend: "default",
  soundReceive: "default",
  soundNotification: "default",
  overlayDefault: true,
};

const SOUND_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "chime", label: "Chime" },
  { value: "ping", label: "Ping" },
  { value: "pop", label: "Pop" },
  { value: "none", label: "None" },
];

const EMAIL_DIGEST_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

// ─── Helpers ────────────────────────────────────────────────────────

function fromApi(data: ApiNotificationPrefs): NotificationPrefs {
  return {
    userId: data.user_id,
    toastEnabled: data.toast_enabled,
    toastOtto: data.toast_otto,
    toastPeople: data.toast_people,
    soundEnabled: data.sound_enabled,
    soundSend: data.sound_send,
    soundReceive: data.sound_receive,
    soundNotification: data.sound_notification,
    overlayDefault: data.overlay_default,
  };
}

function toApiPatch(
  key: keyof NotificationPrefs,
  value: boolean | string,
): Record<string, boolean | string> {
  const keyMap: Record<string, string> = {
    toastEnabled: "toast_enabled",
    toastOtto: "toast_otto",
    toastPeople: "toast_people",
    soundEnabled: "sound_enabled",
    soundSend: "sound_send",
    soundReceive: "sound_receive",
    soundNotification: "sound_notification",
    overlayDefault: "overlay_default",
  };
  const apiKey = keyMap[key];
  if (!apiKey) return {};
  return { [apiKey]: value };
}

// ─── Main Component ─────────────────────────────────────────────────

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isSaving, setIsSaving] = useState(false);
  const [emailDigest, setEmailDigest] = useState("off");

  useEffect(() => {
    apiFetch<ApiNotificationPrefs>("/api/v1/notifications/preferences")
      .then((data) => setPrefs(fromApi(data)))
      .catch(() => {
        // Use defaults if API unavailable (mock mode)
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
      await apiFetch("/api/v1/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify(toApiPatch(key, value)),
      });
    } catch {
      // Keep local state in mock mode
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-primary p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Notifications
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Configure how and when you receive notifications.
          </p>
        </div>
        {isSaving && (
          <span className="text-xs text-text-tertiary">Saving...</span>
        )}
      </div>

      <div className="space-y-8">
        {/* Toast Notifications */}
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Toast Notifications
          </h3>
          <div className="space-y-3">
            <Toggle
              label="Enable toast notifications"
              description="Show popup notifications for activity"
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
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Sounds
          </h3>
          <div className="space-y-3">
            <Toggle
              label="Enable sounds"
              description="Play sounds for notifications"
              checked={prefs.soundEnabled}
              onChange={(v) => updatePref("soundEnabled", v)}
            />
            <SoundSelect
              label="Notification sound"
              value={prefs.soundNotification}
              onChange={(v) => updatePref("soundNotification", v)}
              disabled={!prefs.soundEnabled}
            />
            <SoundSelect
              label="Send sound"
              value={prefs.soundSend}
              onChange={(v) => updatePref("soundSend", v)}
              disabled={!prefs.soundEnabled}
            />
            <SoundSelect
              label="Receive sound"
              value={prefs.soundReceive}
              onChange={(v) => updatePref("soundReceive", v)}
              disabled={!prefs.soundEnabled}
            />
          </div>
        </section>

        {/* Email Digest */}
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Email Digest
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-text-primary">Digest frequency</div>
                <div className="text-xs text-text-tertiary mt-0.5">
                  Receive a summary of missed notifications via email
                </div>
              </div>
              <select
                value={emailDigest}
                onChange={(e) => setEmailDigest(e.target.value)}
                className="rounded-md border border-border-subtle bg-surface-raised px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {EMAIL_DIGEST_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Display */}
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Display
          </h3>
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

// ─── Toggle Component ───────────────────────────────────────────────

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
          <div className="text-xs text-text-tertiary mt-0.5">
            {description}
          </div>
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

// ─── Sound Select Component ─────────────────────────────────────────

function SoundSelect({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="text-sm text-text-primary">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border-subtle bg-surface-raised px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {SOUND_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
