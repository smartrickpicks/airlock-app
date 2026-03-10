"use client";

import { useEffect, useRef } from "react";
import {
  ExternalLink,
  Pin,
  CheckCheck,
  Link2,
  AlertTriangle,
  Archive,
} from "lucide-react";

interface VaultContextMenuProps {
  x: number;
  y: number;
  vaultId: string;
  vaultSlug: string;
  moduleName: string;
  onClose: () => void;
  onAction: (action: string, vaultId: string) => void;
}

const ACTIONS = [
  { id: "open_new_tab", label: "Open in New Tab", icon: ExternalLink },
  { id: "pin", label: "Pin to Top", icon: Pin },
  { id: "mark_read", label: "Mark as Read", icon: CheckCheck },
  { id: "copy_link", label: "Copy Link", icon: Link2 },
  { id: "view_triage", label: "View in Triage", icon: AlertTriangle },
  { id: "archive", label: "Archive", icon: Archive, danger: true },
] as const;

export default function VaultContextMenu({
  x,
  y,
  vaultId,
  vaultSlug,
  moduleName,
  onClose,
  onAction,
}: VaultContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Clamp position to viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - ACTIONS.length * 36 - 16),
    zIndex: 9999,
  };

  const handleAction = (actionId: string) => {
    if (actionId === "copy_link") {
      const url = `${window.location.origin}/${moduleName}/${vaultSlug}`;
      navigator.clipboard.writeText(url);
    } else if (actionId === "open_new_tab") {
      window.open(`/${moduleName}/${vaultSlug}`, "_blank");
    }
    onAction(actionId, vaultId);
    onClose();
  };

  return (
    <div
      ref={ref}
      style={style}
      className="w-48 rounded-lg border border-surface-border bg-surface-raised py-1 shadow-xl"
    >
      {ACTIONS.map((action, i) => (
        <div key={action.id}>
          {action.id === "archive" && (
            <div className="mx-2 my-1 h-px bg-surface-border" />
          )}
          <button
            onClick={() => handleAction(action.id)}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
              "danger" in action && action.danger
                ? "text-accent-danger hover:bg-accent-danger/10"
                : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
            }`}
          >
            <action.icon size={14} />
            {action.label}
          </button>
        </div>
      ))}
    </div>
  );
}
