"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  code: string;
  status: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-accent-warning/20 text-accent-warning",
  accepted: "bg-accent-success/20 text-accent-success",
  expired: "bg-surface-overlay text-text-muted",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function relativeExpiry(iso: string): string {
  try {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 1) return "1 day left";
    return `${days} days left`;
  } catch {
    return iso;
  }
}

interface PendingInvitesListProps {
  refreshKey?: number;
}

export default function PendingInvitesList({
  refreshKey,
}: PendingInvitesListProps) {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<PendingInvite[]>("/api/v1/invites");
      setInvites(data);
    } catch {
      // API not running — mock fallback: empty list
      setInvites([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites, refreshKey]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-surface-border p-4">
        <p className="text-xs text-text-muted">Loading invites...</p>
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border p-6 text-center">
        <p className="text-sm text-text-muted">
          No pending invites. Click &quot;Invite Member&quot; to send one.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border">
      <table className="w-full">
        <thead className="bg-surface-overlay">
          <tr>
            <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Email
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Role
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Status
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Sent
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Expires
            </th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr
              key={invite.id}
              className="border-t border-surface-border transition-colors hover:bg-surface-overlay/50"
            >
              <td className="px-4 py-2.5">
                <span className="text-sm text-text-primary">
                  {invite.email}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-xs capitalize text-text-secondary">
                  {invite.role}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                    STATUS_BADGE[invite.status] ?? STATUS_BADGE.pending
                  }`}
                >
                  {invite.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs text-text-muted">
                {formatDate(invite.created_at)}
              </td>
              <td className="px-4 py-2.5 text-xs text-text-muted">
                {invite.status === "accepted"
                  ? "—"
                  : relativeExpiry(invite.expires_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
