"use client";

import { useState, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import Button from "@/components/atoms/Button";

// Editable profile fields beyond just display name.
// All fields are stored in local state until "Save Changes" is hit.
// When the API is wired up, the save action will POST to /api/v1/users/me.
interface ProfileForm {
  displayName: string;
  headline: string; // One-liner under the name (e.g. "Founder · Music & Entertainment")
  bio: string; // Longer "about me" blurb
  pronouns: string;
  timezone: string;
  avatarUrl: string; // Preview URL (local blob or remote)
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
];

export default function ProfileSettings() {
  const { user, orgRole } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileForm>({
    displayName: user?.name ?? "",
    headline: "",
    bio: "",
    pronouns: "",
    timezone: "America/Chicago",
    avatarUrl: user?.avatarUrl ?? "",
  });
  const [saved, setSaved] = useState(false);

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    set("avatarUrl", objectUrl);
  };

  const handleSave = () => {
    // TODO: POST to /api/v1/users/me when API is ready
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClasses =
    "w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary";
  const labelClasses = "block text-xs font-medium text-text-secondary mb-1";
  const initials = (form.displayName || user?.name || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Your personal profile — visible to everyone in the workspace.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-raised p-5 space-y-5">
        {/* Avatar + name block */}
        <div className="flex items-start gap-5">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-surface-border hover:border-accent-primary transition-colors"
              title="Change avatar"
            >
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent-primary/20 text-2xl font-bold text-accent-primary">
                  {initials}
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-medium text-white">
                  Change
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={handleAvatarClick}
              className="text-[10px] text-text-muted hover:text-accent-primary"
            >
              Upload photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name + headline */}
          <div className="flex-1 space-y-3">
            <div>
              <label htmlFor="display-name" className={labelClasses}>
                Display name
              </label>
              <input
                id="display-name"
                type="text"
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
                placeholder="Your full name or handle"
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="headline" className={labelClasses}>
                Headline
              </label>
              <input
                id="headline"
                type="text"
                value={form.headline}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="e.g. Founder · Music & Entertainment"
                maxLength={80}
                className={inputClasses}
              />
              <p className="mt-1 text-[10px] text-text-muted">
                Shown under your name throughout the workspace. Max 80 chars.
              </p>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className={labelClasses}>
            Bio
          </label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="A few words about yourself — what you work on, your background, what you're building."
            rows={3}
            maxLength={300}
            className={`${inputClasses} resize-none`}
          />
          <p className="mt-1 text-[10px] text-text-muted">
            {form.bio.length}/300 characters
          </p>
        </div>

        {/* Pronouns */}
        <div>
          <label htmlFor="pronouns" className={labelClasses}>
            Pronouns
          </label>
          <input
            id="pronouns"
            type="text"
            value={form.pronouns}
            onChange={(e) => set("pronouns", e.target.value)}
            placeholder="e.g. they/them, she/her, he/him"
            className={`${inputClasses} max-w-xs`}
          />
        </div>

        {/* Email (read-only — managed by auth) */}
        <div>
          <label className={labelClasses}>Email</label>
          <div className="rounded-md bg-surface-sunken px-3 py-2 text-sm text-text-muted">
            {user?.email ?? "—"}
          </div>
          <p className="mt-1 text-[10px] text-text-muted">
            Email is set by your auth provider and cannot be changed here.
          </p>
        </div>

        {/* Org role (read-only — assigned by admin) */}
        <div>
          <label className={labelClasses}>Organization role</label>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-surface-sunken px-3 py-2 text-sm text-text-muted capitalize">
              {orgRole ?? "member"}
            </div>
            {orgRole === "architect" && (
              <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-[10px] font-semibold text-accent-primary">
                Founder · All permissions
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-text-muted">
            Assigned by a workspace admin. Contact your admin to request a role
            change.
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className={labelClasses}>
            Timezone
          </label>
          <select
            id="timezone"
            value={form.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            className={inputClasses}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-1">
          <Button variant="primary" onClick={handleSave}>
            Save changes
          </Button>
          {saved && (
            <span className="text-xs text-accent-success">✓ Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}
