"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Profile", href: "/admin" },
  { label: "Appearance", href: "/admin/settings" },
  { label: "Members", href: "/admin/members" },
  { label: "Feature Flags", href: "/admin/features" },
  { label: "Connectors", href: "/admin/connectors" },
  { label: "Skills", href: "/admin/skills" },
  { label: "Event Bus", href: "/admin/event-bus" },
  { label: "Workflows", href: "/admin/workflows" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 px-6 pt-6">
        <h1 className="text-xl font-semibold text-text-primary">
          Admin & Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Workspace configuration and personal preferences
        </p>
      </div>

      <div className="mt-6 flex-shrink-0 px-6">
        <div className="flex gap-1 border-b border-surface-border">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-b-2 border-accent-primary text-accent-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
