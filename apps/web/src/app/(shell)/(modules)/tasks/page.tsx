"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TasksRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tasks/inbox");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-text-muted">Loading Tasks...</span>
    </div>
  );
}
