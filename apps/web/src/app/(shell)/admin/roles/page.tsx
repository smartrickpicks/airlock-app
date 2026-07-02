"use client";

import { useState } from "react";
import {
  DEFAULT_ROLES,
  PERMISSION_CATALOG,
  ALL_PERMISSION_KEYS,
  ROLE_COLOR_SWATCHES,
  MOCK_MEMBERS,
  type RoleDefinition,
} from "@/lib/mock-admin";

// ─── Helpers ──────────────────────────────────────────────────────────

function PermissionToggle({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      aria-pressed={enabled}
      className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
        enabled ? "bg-accent-primary" : "bg-surface-border"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          enabled ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

type RoleTab = "display" | "permissions" | "members";

// ─── Display tab ──────────────────────────────────────────────────────

function DisplayTab({
  role,
  onUpdate,
}: {
  role: RoleDefinition;
  onUpdate: (patch: Partial<RoleDefinition>) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Role name */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Role name
        </label>
        <input
          type="text"
          value={role.name}
          disabled={role.isSystem}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full max-w-sm rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        {role.isSystem && (
          <p className="mt-1 text-[10px] text-text-muted">
            System role names cannot be changed.
          </p>
        )}
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">
          Role color
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {ROLE_COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => !role.isSystem && onUpdate({ color: swatch })}
              disabled={role.isSystem}
              className={`h-7 w-7 rounded-full border-2 transition-transform disabled:cursor-not-allowed ${
                role.color === swatch
                  ? "scale-110 border-white"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: swatch }}
              title={swatch}
            />
          ))}
          {/* Custom hex input */}
          {!role.isSystem && (
            <div className="flex items-center gap-1.5">
              <div
                className="h-7 w-7 rounded-full border border-surface-border"
                style={{ backgroundColor: role.color }}
              />
              <input
                type="text"
                value={role.color}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) onUpdate({ color: val });
                }}
                className="w-24 rounded border border-surface-border bg-surface-overlay px-2 py-1 font-mono text-xs text-text-primary focus:border-accent-primary focus:outline-none"
                maxLength={7}
              />
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Description
        </label>
        <textarea
          value={role.description}
          disabled={role.isSystem}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={2}
          className="w-full max-w-sm resize-none rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* System badge */}
      {role.isSystem && (
        <div className="flex items-center gap-2 rounded-md border border-surface-border bg-surface-sunken px-3 py-2">
          <span className="text-xs text-text-muted">
            <strong className="text-text-secondary">System role</strong> —
            cannot be deleted or renamed. Permissions are shown as a reference
            in the Permissions tab.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Permissions tab ─────────────────────────────────────────────────

function PermissionsTab({
  role,
  onToggle,
}: {
  role: RoleDefinition;
  onToggle: (key: string) => void;
}) {
  const total = ALL_PERMISSION_KEYS.length;
  const count = role.permissions.length;

  return (
    <div className="space-y-1">
      {/* Count badge */}
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs text-text-muted">
          {role.isSystem
            ? "System role permissions are read-only."
            : "Toggle individual permissions on or off for this role."}
        </p>
        <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] font-medium text-text-secondary">
          {count} / {total} permissions
        </span>
      </div>

      {PERMISSION_CATALOG.map((group) => (
        <div key={group.group} className="mb-1">
          {/* Group header */}
          <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {group.group}
          </p>
          <div className="rounded-lg border border-surface-border divide-y divide-surface-border">
            {group.permissions.map((perm) => {
              const enabled = role.permissions.includes(perm.key);
              return (
                <div
                  key={perm.key}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-surface-overlay/40"
                >
                  <div className="pr-4">
                    <p className="text-sm font-medium text-text-primary">
                      {perm.label}
                    </p>
                    <p className="text-xs text-text-muted">
                      {perm.description}
                    </p>
                  </div>
                  <PermissionToggle
                    enabled={enabled}
                    disabled={role.isSystem}
                    onChange={() => onToggle(perm.key)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Members tab ─────────────────────────────────────────────────────

function MembersTab({ role }: { role: RoleDefinition }) {
  // Show members whose module role (in any module) matches this role id.
  const matched = MOCK_MEMBERS.filter(
    (m) =>
      Object.values(m.moduleRoles).includes(role.id as never) ||
      m.orgRole === role.id,
  );

  if (matched.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="mb-3 h-10 w-10 rounded-full"
          style={{ backgroundColor: role.color + "33" }}
        />
        <p className="text-sm font-medium text-text-secondary">
          No members assigned to {role.name}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Go to Members to assign this role to someone.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-surface-border rounded-lg border border-surface-border">
      {matched.map((m) => (
        <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-primary/20 text-xs font-bold text-accent-primary">
            {m.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">{m.name}</p>
            <p className="text-[10px] text-text-muted">{m.email}</p>
          </div>
          <span className="text-xs text-text-muted capitalize">
            {m.orgRole}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Create Role form ─────────────────────────────────────────────────

function CreateRoleForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(ROLE_COLOR_SWATCHES[0]);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h3 className="text-base font-semibold text-text-primary">
          Create role
        </h3>
        <p className="mt-0.5 text-xs text-text-secondary">
          New roles start with no permissions. Add them in the Permissions tab
          after creating.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Role name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Senior Analyst"
          className="w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">
          Role color
        </label>
        <div className="flex flex-wrap gap-2">
          {ROLE_COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${
                color === swatch
                  ? "scale-110 border-white"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => name.trim() && onConfirm(name.trim(), color)}
          disabled={!name.trim()}
          className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Create role
        </button>
        <button
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm text-text-muted hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(
    "architect",
  );
  const [activeTab, setActiveTab] = useState<RoleTab>("display");

  const selectedRole = roles.find((r) => r.id === selectedId) ?? null;
  const isCreating = selectedId === "new";

  const updateRole = (id: string, patch: Partial<RoleDefinition>) => {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const togglePermission = (roleId: string, key: string) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;
        const has = r.permissions.includes(key);
        return {
          ...r,
          permissions: has
            ? r.permissions.filter((p) => p !== key)
            : [...r.permissions, key],
        };
      }),
    );
  };

  const createRole = (name: string, color: string) => {
    const newRole: RoleDefinition = {
      id: `custom_${Date.now()}`,
      name,
      color,
      isSystem: false,
      description: "",
      permissions: [],
      memberCount: 0,
      hierarchy: roles.length,
    };
    setRoles((prev) => [...prev, newRole]);
    setSelectedId(newRole.id);
    setActiveTab("display");
  };

  const deleteRole = (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    setSelectedId("architect");
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel: role list ──────────────────────────────────── */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-surface-border bg-surface-raised overflow-y-auto">
        <div className="border-b border-surface-border px-3 py-3">
          <button
            onClick={() => {
              setSelectedId("new");
              setActiveTab("display");
            }}
            className="flex w-full items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <span className="text-base leading-none">+</span>
            Create Role
          </button>
        </div>

        <div className="flex-1 px-1 py-2 space-y-0.5">
          {/* System roles */}
          <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            System roles
          </p>
          {roles
            .filter((r) => r.isSystem)
            .map((role) => (
              <button
                key={role.id}
                onClick={() => {
                  setSelectedId(role.id);
                  setActiveTab("display");
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                  selectedId === role.id
                    ? "bg-accent-primary/15 text-text-primary"
                    : "text-text-secondary hover:bg-surface-overlay"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span className="flex-1 truncate text-sm">{role.name}</span>
                {role.memberCount > 0 && (
                  <span className="text-[10px] text-text-muted">
                    {role.memberCount}
                  </span>
                )}
              </button>
            ))}

          {/* Custom roles */}
          {roles.some((r) => !r.isSystem) && (
            <>
              <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Custom roles
              </p>
              {roles
                .filter((r) => !r.isSystem)
                .map((role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      setSelectedId(role.id);
                      setActiveTab("display");
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                      selectedId === role.id
                        ? "bg-accent-primary/15 text-text-primary"
                        : "text-text-secondary hover:bg-surface-overlay"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <span className="flex-1 truncate text-sm">{role.name}</span>
                  </button>
                ))}
            </>
          )}

          {/* Default permissions row (like Discord @everyone) */}
          <div className="mx-1 mt-3 border-t border-surface-border pt-2">
            <button
              onClick={() => setSelectedId("viewer")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-text-muted hover:bg-surface-overlay hover:text-text-secondary"
            >
              <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full border border-surface-border bg-surface-overlay text-[7px]">
                @
              </span>
              <span className="text-xs">Default permissions</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Right panel: editor ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {isCreating ? (
          <CreateRoleForm
            onConfirm={createRole}
            onCancel={() => setSelectedId("architect")}
          />
        ) : selectedRole ? (
          <div className="flex h-full flex-col">
            {/* Editor header */}
            <div className="flex flex-shrink-0 items-center gap-3 border-b border-surface-border px-5 py-3">
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedRole.color }}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Edit role —
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {selectedRole.name}
              </span>
              {selectedRole.isSystem && (
                <span className="ml-1 rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] text-text-muted">
                  system
                </span>
              )}
              {/* Delete button for custom roles */}
              {!selectedRole.isSystem && (
                <button
                  onClick={() => deleteRole(selectedRole.id)}
                  className="ml-auto text-xs text-accent-danger hover:opacity-80"
                >
                  Delete role
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex flex-shrink-0 gap-0 border-b border-surface-border px-5">
              {(["display", "permissions", "members"] as RoleTab[]).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-accent-primary text-accent-primary"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "display" && (
                <DisplayTab
                  role={selectedRole}
                  onUpdate={(patch) => updateRole(selectedRole.id, patch)}
                />
              )}
              {activeTab === "permissions" && (
                <PermissionsTab
                  role={selectedRole}
                  onToggle={(key) => togglePermission(selectedRole.id, key)}
                />
              )}
              {activeTab === "members" && <MembersTab role={selectedRole} />}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            Select a role to edit
          </div>
        )}
      </main>
    </div>
  );
}
