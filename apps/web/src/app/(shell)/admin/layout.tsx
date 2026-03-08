"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Admin layout — renders the capability tree (full canvas) on /admin,
 * and preserves the header + back-link for sub-pages like /admin/members.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isTreeRoot = pathname === "/admin";

  if (isTreeRoot) {
    // Full-canvas mode — tree fills entire area
    return <div className="h-full w-full overflow-hidden">{children}</div>;
  }

  // Sub-page mode — minimal header with back link
  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 px-6 pt-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-accent-primary"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Capability Tree
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
