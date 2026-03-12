"use client";

import { useState } from "react";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface GateDecisionCardProps {
  gateName: string;
  vaultName: string;
  checklist: ChecklistItem[];
  onApprove: (checklist: ChecklistItem[]) => void;
  onReject: (reason: string) => void;
  userRole: "gatekeeper" | "owner";
}

export default function GateDecisionCard({
  gateName,
  vaultName,
  checklist: initialChecklist,
  onApprove,
  onReject,
  userRole,
}: GateDecisionCardProps) {
  const [checklist, setChecklist] = useState(initialChecklist);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [decided, setDecided] = useState(false);

  const allChecked = checklist.every((item) => item.checked);

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const handleApprove = () => {
    setDecided(true);
    onApprove(checklist);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    setDecided(true);
    onReject(rejectReason.trim());
  };

  return (
    <div className="rounded-lg border border-[#A855F7]/30 bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#A855F7]">
          Gate Decision
        </span>
        <span className="text-[10px] text-text-muted capitalize">
          {userRole}
        </span>
      </div>

      <p className="text-sm font-semibold text-text-primary">{gateName}</p>
      <p className="text-[11px] text-text-muted">{vaultName}</p>

      {!decided && (
        <>
          {/* Checklist */}
          <div className="mt-3 space-y-1.5">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item.id)}
                  className="h-3.5 w-3.5 rounded border-surface-border accent-[#00D1FF]"
                />
                <span
                  className={`text-[12px] ${item.checked ? "text-text-primary" : "text-text-muted"}`}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>

          {/* Actions */}
          {!showReject ? (
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleApprove}
                disabled={!allChecked}
                className="rounded-lg bg-accent-success px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-accent-success/80 disabled:opacity-40"
              >
                Approve
              </button>
              <button
                onClick={() => setShowReject(true)}
                className="rounded-lg border border-accent-danger/30 px-3 py-1.5 text-[12px] text-accent-danger hover:bg-accent-danger/10 transition-colors"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={2}
                className="w-full rounded border border-surface-border bg-surface-overlay px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="rounded-lg bg-accent-danger px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-danger/80 disabled:opacity-40"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => setShowReject(false)}
                  className="text-[12px] text-text-muted hover:text-text-primary"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {decided && (
        <p className="mt-2 text-[11px] font-medium text-accent-success">
          Decision submitted
        </p>
      )}
    </div>
  );
}
