"use client";

import { useRealtimeStore } from "@/stores/realtime.store";
import { CONNECTION_STATUS_CONFIG } from "@/lib/mock-realtime";

export default function ConnectionStatus() {
  const status = useRealtimeStore((s) => s.status);
  const cfg = CONNECTION_STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-1.5 px-1" title={cfg.label}>
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dotColor} ${
          status === "reconnecting" ? "animate-pulse" : ""
        }`}
      />
      <span className={`text-[9px] font-medium ${cfg.color} select-none`}>
        {status === "connected" ? "" : cfg.label}
      </span>
    </div>
  );
}
