"use client";

import { useEffect } from "react";
import { useEventBusStore } from "@/stores/event-bus.store";
import EventBusMonitor from "@/components/organisms/EventBusMonitor";

export default function EventBusPage() {
  const { fetchEventBus } = useEventBusStore();

  useEffect(() => {
    fetchEventBus();
  }, [fetchEventBus]);

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <EventBusMonitor />
    </div>
  );
}
