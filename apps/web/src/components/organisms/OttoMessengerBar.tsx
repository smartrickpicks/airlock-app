"use client";

import { useState, useEffect } from "react";
import OttoMessengerToggle from "@/components/molecules/OttoMessengerToggle";
import OttoMessengerWindow from "@/components/organisms/OttoMessengerWindow";

export default function OttoMessengerBar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <>
      <OttoMessengerWindow />
      <div className="fixed bottom-0 right-0 z-40 flex items-center gap-2 border-t border-surface-border bg-surface-base/80 px-4 py-1.5 backdrop-blur-sm">
        <OttoMessengerToggle />
      </div>
    </>
  );
}
