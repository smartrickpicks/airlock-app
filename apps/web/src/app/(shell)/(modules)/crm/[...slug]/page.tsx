"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * CRM catch-all route — redirects unknown CRM paths to /crm/accounts.
 * Will be replaced with react-admin integration when API is live.
 */
export default function CrmCatchAllPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crm/accounts");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-text-muted">Redirecting...</span>
    </div>
  );
}
