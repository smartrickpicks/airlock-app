"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminStore } from "@/stores/admin.store";
import FeatureFlags from "@/components/organisms/FeatureFlags";

const NAV_ITEMS = [
  { label: "Profile", href: "/admin" },
  { label: "Appearance", href: "/admin/settings" },
  { label: "Members", href: "/admin/members" },
  { label: "Feature Flags", href: "/admin/features" },
];

export default function AdminFeaturesPage() {
  const pathname = usePathname();
  const { fetchAdmin } = useAdminStore();

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Admin & Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Workspace configuration and personal preferences
        </p>
      </div>

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

      <FeatureFlags />
    </div>
  );
}
