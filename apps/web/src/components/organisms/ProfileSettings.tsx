"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import Button from "@/components/atoms/Button";

export default function ProfileSettings() {
  const { user, orgRole } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClasses =
    "w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary";
  const labelClasses = "block text-xs font-medium text-text-secondary mb-1";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Your personal account information
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-raised p-5 space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-primary/20 text-xl font-bold text-accent-primary">
            {(user?.name ?? "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {user?.name ?? "Unknown"}
            </p>
            <p className="text-xs text-text-muted">{user?.email ?? "—"}</p>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="display-name" className={labelClasses}>
            Display Name
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClasses}
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className={labelClasses}>Email</label>
          <div className="rounded-md bg-surface-sunken px-3 py-2 text-sm text-text-muted">
            {user?.email ?? "—"}
          </div>
        </div>

        {/* Role (read-only) */}
        <div>
          <label className={labelClasses}>Organization Role</label>
          <div className="rounded-md bg-surface-sunken px-3 py-2 text-sm text-text-muted capitalize">
            {orgRole ?? "member"}
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className={labelClasses}>
            Timezone
          </label>
          <select
            id="timezone"
            className={inputClasses}
            defaultValue="America/Chicago"
          >
            <option value="America/New_York">Eastern (ET)</option>
            <option value="America/Chicago">Central (CT)</option>
            <option value="America/Denver">Mountain (MT)</option>
            <option value="America/Los_Angeles">Pacific (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Berlin">Berlin (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
          {saved && <span className="text-xs text-accent-success">Saved</span>}
        </div>
      </div>
    </div>
  );
}
