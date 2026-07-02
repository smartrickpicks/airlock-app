"use client";

import { ShieldCheck, Crown, Eye } from "lucide-react";

interface ApprovalStatusProps {
  gatekeeperApproved: boolean;
  ownerApproved: boolean;
  onApprove: () => void;
  canApprove: boolean; // true if current user has gatekeeper/owner role
}

export default function ApprovalStatus({
  gatekeeperApproved,
  ownerApproved,
  onApprove,
  canApprove,
}: ApprovalStatusProps) {
  const fullyApproved = gatekeeperApproved && ownerApproved;

  return (
    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
      <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" />
        Review Approval Status
      </h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm text-gray-300">Gatekeeper Review</span>
          </div>
          {gatekeeperApproved ? (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
              Approved
            </span>
          ) : (
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">
              Pending
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm text-gray-300">Owner Approval</span>
          </div>
          {ownerApproved ? (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
              Approved
            </span>
          ) : (
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">
              Pending
            </span>
          )}
        </div>
      </div>

      {!fullyApproved && canApprove && (
        <button
          onClick={onApprove}
          className="mt-3 w-full rounded-md bg-purple-500/20 px-3 py-2 text-sm font-medium text-purple-300 hover:bg-purple-500/30 transition-colors"
        >
          Approve
        </button>
      )}

      {fullyApproved && (
        <div className="mt-3 text-center text-xs text-green-400">
          All approvals received — ready to advance to Ship
        </div>
      )}
    </div>
  );
}
