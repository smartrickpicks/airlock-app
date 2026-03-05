"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DocumentsRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/documents/library");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-text-muted">Loading Documents...</span>
    </div>
  );
}
