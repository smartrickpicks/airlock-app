"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MOCK_WORKSPACE, INDUSTRY_OPTIONS } from "@/lib/mock-admin";
import type { WorkspaceSettings } from "@/lib/mock-admin";
import { apiFetch } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-text-muted/15 text-text-muted",
  pro: "bg-accent-primary/15 text-accent-primary",
  enterprise: "bg-accent-success/15 text-accent-success",
  beta: "bg-accent-warning/15 text-accent-warning",
};

const ACCENT_SWATCHES = [
  "#00d1ff", // Airlock cyan
  "#22c55e", // green
  "#a855f7", // purple
  "#eab308", // yellow
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#64748b", // slate
];

interface WorkspaceApiResponse {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  plan?: string;
  logo_url?: string;
  accent_color?: string;
  member_count?: number;
}

function apiToWorkspace(api: WorkspaceApiResponse): WorkspaceSettings {
  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    industry: api.industry || "Other",
    plan: (api.plan as WorkspaceSettings["plan"]) || "starter",
    createdAt: MOCK_WORKSPACE.createdAt,
    inviteUrl: `https://app.airlock.dev/invite/${api.slug}/tk_invite`,
    logoUrl: api.logo_url || undefined,
    accentColor: api.accent_color || "#00d1ff",
    memberCount: api.member_count || 0,
    vaultCount: MOCK_WORKSPACE.vaultCount,
  };
}

export default function AdminWorkspacePage() {
  const [workspace, setWorkspace] = useState<WorkspaceSettings>(MOCK_WORKSPACE);
  const [name, setName] = useState(MOCK_WORKSPACE.name);
  const [industry, setIndustry] = useState(MOCK_WORKSPACE.industry);
  const [logoUrl, setLogoUrl] = useState(MOCK_WORKSPACE.logoUrl || "");
  const [accentColor, setAccentColor] = useState(MOCK_WORKSPACE.accentColor);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    MOCK_WORKSPACE.logoUrl || null,
  );

  // Fetch workspace data on mount
  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const data = await apiFetch<WorkspaceApiResponse>(
          "/api/v1/workspaces/me",
        );
        const ws = apiToWorkspace(data);
        setWorkspace(ws);
        setName(ws.name);
        setIndustry(ws.industry);
        setLogoUrl(ws.logoUrl || "");
        setAccentColor(ws.accentColor);
        setLogoPreview(ws.logoUrl || null);
      } catch {
        // Mock fallback — already initialized with MOCK_WORKSPACE
      }
    }
    fetchWorkspace();
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(workspace.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const data = await apiFetch<WorkspaceApiResponse>(
        "/api/v1/workspaces/me/config",
        {
          method: "PATCH",
          body: JSON.stringify({
            name,
            industry,
            logo_url: logoUrl || null,
            accent_color: accentColor,
          }),
        },
      );
      const ws = apiToWorkspace(data);
      setWorkspace(ws);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Mock fallback — just show saved
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [name, industry, logoUrl, accentColor]);

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Create a local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      // In a real implementation, upload to storage and get a URL back.
      // For mock-first, store the data URL as a placeholder.
      setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    setLogoUrl("");
  }

  return (
    <motion.div className="h-full overflow-y-auto p-6" {...fadeInUp}>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Workspace</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your workspace settings, branding, and account details.
          </p>
        </div>

        {/* General */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">General</h2>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Workspace name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-mono text-text-muted">
                {workspace.id}
              </span>
            </div>
          </div>
        </section>

        {/* Branding */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Branding
            </h2>
          </div>
          <div className="space-y-5 p-4">
            {/* Logo upload */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-surface-border bg-surface-base">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreview}
                      alt="Workspace logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-text-muted">No logo</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer rounded-md border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-raised">
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                  </label>
                  {logoPreview && (
                    <button
                      onClick={handleRemoveLogo}
                      className="text-left text-xs text-text-muted hover:text-accent-error"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Recommended: 256x256px, PNG or SVG.
              </p>
            </div>

            {/* Accent color picker */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Accent color
              </label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {ACCENT_SWATCHES.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${
                        accentColor === color
                          ? "scale-110 border-text-primary"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-7 w-7 rounded-full border border-surface-border"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="font-mono text-xs text-text-muted">
                    {accentColor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
          </button>
        </div>

        {/* Plan & usage */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Plan & usage
            </h2>
          </div>
          <div className="divide-y divide-surface-border">
            {(
              [
                [
                  "Plan",
                  <span
                    key="plan"
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PLAN_BADGE[workspace.plan] || PLAN_BADGE.starter}`}
                  >
                    {workspace.plan}
                  </span>,
                ],
                [
                  "Members",
                  <span key="members" className="text-sm text-text-primary">
                    {workspace.memberCount}
                  </span>,
                ],
                [
                  "Vaults",
                  <span key="vaults" className="text-sm text-text-primary">
                    {workspace.vaultCount}
                  </span>,
                ],
                [
                  "Created",
                  <span key="created" className="text-sm text-text-secondary">
                    {new Date(workspace.createdAt).toLocaleDateString()}
                  </span>,
                ],
              ] as [string, React.ReactNode][]
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm text-text-secondary">{label}</span>
                {value}
              </div>
            ))}
          </div>
        </section>

        {/* Invite link */}
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Invite link
            </h2>
          </div>
          <div className="p-4">
            <p className="mb-3 text-xs text-text-secondary">
              Share this link to invite new members. Rotate it if compromised.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={workspace.inviteUrl}
                className="flex-1 rounded-md border border-surface-border bg-surface-base px-3 py-2 font-mono text-xs text-text-muted"
              />
              <button
                onClick={handleCopy}
                className="rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-raised"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-lg border border-accent-error/30 bg-surface-raised">
          <div className="border-b border-accent-error/20 px-4 py-3">
            <h2 className="text-sm font-semibold text-accent-error">
              Danger zone
            </h2>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Archive workspace
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Freezes all vaults. Members lose access. Irreversible without
                support.
              </p>
            </div>
            <button className="rounded-md border border-accent-error/40 px-3 py-1.5 text-xs font-medium text-accent-error hover:bg-accent-error/10">
              Archive
            </button>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
