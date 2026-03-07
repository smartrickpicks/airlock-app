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
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Event Bus</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Queue health, event flow, and dead letter queue management
        </p>
      </div>
      <EventBusMonitor />
    </div>
  );
}
