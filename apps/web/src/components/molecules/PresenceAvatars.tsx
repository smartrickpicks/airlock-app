"use client";

import { useRealtimeStore } from "@/stores/realtime.store";

const STATUS_DOT_COLOR: Record<string, string> = {
  online: "bg-accent-success",
  away: "bg-accent-warning",
  busy: "bg-accent-danger",
};

export default function PresenceAvatars() {
  const presenceUsers = useRealtimeStore((s) => s.presenceUsers);
  const status = useRealtimeStore((s) => s.status);

  if (status !== "connected" || presenceUsers.length === 0) return null;

  const visible = presenceUsers.slice(0, 4);
  const overflow = presenceUsers.length - visible.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((user) => (
        <div
          key={user.id}
          className="relative"
          title={`${user.name} (${user.status})`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-surface-sunken bg-surface-overlay text-[8px] font-bold text-text-secondary">
            {user.initials}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-surface-sunken ${STATUS_DOT_COLOR[user.status]}`}
          />
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-surface-sunken bg-surface-overlay text-[8px] font-medium text-text-muted">
          +{overflow}
        </div>
      )}
    </div>
  );
}
