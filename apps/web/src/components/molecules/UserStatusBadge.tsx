"use client";

import { useMessengerStore } from "@/stores/messenger.store";

interface UserStatusBadgeProps {
  userId: string;
  showText?: boolean;
}

export default function UserStatusBadge({
  userId,
  showText = false,
}: UserStatusBadgeProps) {
  const status = useMessengerStore((s) => s.userStatuses[userId]);

  if (!status) return null;

  return (
    <span
      className="inline-flex items-center gap-1"
      title={`${status.emoji} ${status.text}`}
    >
      <span className="text-xs">{status.emoji}</span>
      {showText && (
        <span className="text-xs text-gray-400 truncate max-w-[120px]">
          {status.text}
        </span>
      )}
    </span>
  );
}
