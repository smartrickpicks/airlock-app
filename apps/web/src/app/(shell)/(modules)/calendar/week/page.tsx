"use client";

import { useEffect, useCallback } from "react";
import { useCalendarStore } from "@/stores/calendar.store";
import CalendarWeekView from "@/components/organisms/CalendarWeekView";
import FilterPills from "@/components/molecules/FilterPills";
import type { CalendarEventSource } from "@/lib/mock-calendar";

const SOURCE_OPTIONS = [
  { value: "all", label: "All Modules" },
  { value: "contracts", label: "Contracts" },
  { value: "tasks", label: "Tasks" },
  { value: "crm", label: "CRM" },
  { value: "calendar", label: "Calendar" },
];

export default function CalendarWeekPage() {
  const {
    fetchEvents,
    isLoading,
    currentDate,
    sourceFilter,
    setSourceFilter,
    setCurrentDate,
    getFilteredEvents,
  } = useCalendarStore();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = getFilteredEvents();

  const handleNavigateWeek = useCallback(
    (direction: 1 | -1) => {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + direction * 7);
      setCurrentDate(next);
    },
    [currentDate, setCurrentDate],
  );

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      {/* Header + filters */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Week</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {filteredEvents.length} events this period
          </p>
        </div>
        <FilterPills
          filters={SOURCE_OPTIONS}
          activeValue={sourceFilter}
          onChange={(v) => setSourceFilter(v as CalendarEventSource | "all")}
        />
      </div>

      {/* Week grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading events...</p>
        </div>
      ) : (
        <CalendarWeekView
          events={filteredEvents}
          currentDate={currentDate}
          onNavigateWeek={handleNavigateWeek}
          onToday={handleToday}
        />
      )}
    </div>
  );
}
