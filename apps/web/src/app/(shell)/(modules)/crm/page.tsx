"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * CRM module root — redirects to /crm/accounts (default CRM view).
 */
export default function CrmRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crm/accounts");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-text-muted">Loading CRM...</span>
    </div>
  );
}
