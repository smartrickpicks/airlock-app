"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CalendarRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/calendar/month");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-text-muted">Loading Calendar...</span>
    </div>
  );
}
