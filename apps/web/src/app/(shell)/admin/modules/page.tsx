"use client";

import { useState } from "react";
import { MOCK_MODULE_CONFIGS, type ModuleConfig } from "@/lib/mock-admin";

export default function AdminModulesPage() {
  const [modules, setModules] = useState<ModuleConfig[]>(MOCK_MODULE_CONFIGS);

  function toggle(id: string) {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">

        <div>
          <h1 className="text-lg font-bold text-text-primary">Modules</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Enable or disable modules workspace-wide. Disabled modules hide from all members.
          </p>
        </div>

        <div className="space-y-3">
          {modules.map((mod) => (
            <div
              key={mod.id}
              className="rounded-lg border border-surface-border bg-surface-raised"
            >
              <div className="flex items-start justify-between p-4">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${mod.color}`}>
                      {mod.label}
                    </span>
                    {mod.chambers.length > 0 && (
                      <span className="text-xs text-text-muted">
                        {mod.chambers.join(" › ")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{mod.description}</p>
                  <div className="mt-2 flex gap-4 text-xs text-text-muted">
                    {mod.vaultCount > 0 && <span>{mod.vaultCount} vaults</span>}
                    <span>{mod.activeMembers} active members</span>
                  </div>
                </div>
                <button
                  onClick={() => toggle(mod.id)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    mod.enabled ? "bg-accent-primary" : "bg-surface-overlay"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      mod.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-text-muted">
          Changes take effect immediately. Disabling a module does not delete vault data.
        </p>

      </div>
    </div>
  );
}
