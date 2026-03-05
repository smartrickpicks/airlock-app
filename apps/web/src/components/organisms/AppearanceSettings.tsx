"use client";

import { useAdminStore } from "@/stores/admin.store";
import {
  THEME_OPTIONS,
  FONT_SIZE_OPTIONS,
  type ThemeMode,
  type FontSize,
} from "@/lib/mock-admin";

export default function AppearanceSettings() {
  const { preferences, updatePreference } = useAdminStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Appearance</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Customize the look and feel of your workspace
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-raised p-5 space-y-6">
        {/* Theme */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Theme
          </label>
          <div className="flex gap-3">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  updatePreference("theme", opt.value as ThemeMode)
                }
                className={`flex-1 rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors ${
                  preferences.theme === opt.value
                    ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                    : "border-surface-border text-text-secondary hover:border-text-muted/30 hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Font Size
          </label>
          <div className="flex gap-3">
            {FONT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  updatePreference("fontSize", opt.value as FontSize)
                }
                className={`flex-1 rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors ${
                  preferences.fontSize === opt.value
                    ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                    : "border-surface-border text-text-secondary hover:border-text-muted/30 hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Width */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Sidebar Width — {preferences.sidebarWidth}px
          </label>
          <input
            type="range"
            min={180}
            max={360}
            step={20}
            value={preferences.sidebarWidth}
            onChange={(e) =>
              updatePreference("sidebarWidth", Number(e.target.value))
            }
            className="w-full accent-accent-primary"
          />
          <div className="mt-1 flex justify-between text-[10px] text-text-muted">
            <span>180px</span>
            <span>360px</span>
          </div>
        </div>

        {/* Toggle options */}
        <div className="space-y-3">
          <ToggleRow
            label="Reduced Motion"
            description="Minimize animations and transitions"
            checked={preferences.reducedMotion}
            onChange={(v) => updatePreference("reducedMotion", v)}
          />
          <ToggleRow
            label="High Contrast"
            description="Increase contrast for better visibility"
            checked={preferences.highContrast}
            onChange={(v) => updatePreference("highContrast", v)}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-accent-primary" : "bg-surface-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
