"use client";

import { useEffect } from "react";
import { useCalendarStore } from "@/stores/calendar.store";
import MonthGrid from "@/components/organisms/MonthGrid";
import FilterPills from "@/components/molecules/FilterPills";
import type { CalendarEventSource } from "@/lib/mock-calendar";

const SOURCE_OPTIONS = [
  { value: "all", label: "All Modules" },
  { value: "contracts", label: "Contracts" },
  { value: "tasks", label: "Tasks" },
  { value: "crm", label: "CRM" },
  { value: "calendar", label: "Calendar" },
];

export default function CalendarMonthPage() {
  const {
    fetchEvents,
    isLoading,
    currentDate,
    sourceFilter,
    getFilteredEvents,
    navigateMonth,
    setSourceFilter,
    setCurrentDate,
  } = useCalendarStore();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = getFilteredEvents();

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Calendar</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Dates from vaults and task due dates
          </p>
        </div>
        <FilterPills
          filters={SOURCE_OPTIONS}
          activeValue={sourceFilter}
          onChange={(v) => setSourceFilter(v as CalendarEventSource | "all")}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading events...</p>
        </div>
      ) : (
        <MonthGrid
          currentDate={currentDate}
          events={filteredEvents}
          onNavigate={navigateMonth}
          onDateClick={(date) => setCurrentDate(date)}
        />
      )}
    </div>
  );
}
