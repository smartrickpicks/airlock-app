# Modules Push Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the newly installed Tier 1 packages into 6 existing module views, upgrading them from custom/placeholder components to professional-grade UX.

**Architecture:** Each task creates or modifies a single organism component, then wires it into the existing page. All data comes from existing mock files and stores. Heavy components use `'use client'` + `dynamic(() => import(...), { ssr: false })`.

**Tech Stack:** Recharts, @tremor/react, @fullcalendar/react, frappe-gantt, @fortune-sheet/react, @tanstack/react-table, date-fns, Radix UI, Framer Motion

---

### Task 1: Dispatch Dashboard Charts (Recharts + Tremor)

**Files:**

- Create: `apps/web/src/components/organisms/DispatchCharts.tsx`
- Modify: `apps/web/src/app/(shell)/page.tsx`

**Context:** The Dispatch homepage has a "Command Center" section in the Control panel (right side) with 3 static metric cards (Active Vaults, Unread Alerts, Recent Events). We'll add a `DispatchCharts` organism below these metrics that renders pipeline and activity charts using Recharts + Tremor.

**Step 1: Create the DispatchCharts organism**

Create `apps/web/src/components/organisms/DispatchCharts.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, Metric, Text, Flex, ProgressBar } from "@tremor/react";

const PIPELINE_DATA = [
  { stage: "Prospect", count: 2, fill: "var(--color-accent-primary)" },
  { stage: "Discovery", count: 2, fill: "var(--color-accent-secondary)" },
  { stage: "Proposal", count: 1, fill: "var(--color-chamber-review)" },
  { stage: "Negotiate", count: 0, fill: "var(--color-accent-warning)" },
  { stage: "Close", count: 1, fill: "var(--color-accent-success)" },
];

const CHAMBER_DATA = [
  { name: "Discover", value: 4, color: "var(--color-chamber-discover)" },
  { name: "Build", value: 2, color: "var(--color-chamber-build)" },
  { name: "Review", value: 1, color: "var(--color-chamber-review)" },
  { name: "Ship", value: 1, color: "var(--color-chamber-ship)" },
];

const TASK_COMPLETION = { completed: 18, total: 24 };

export default function DispatchCharts() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        Analytics
      </div>

      {/* Task Completion KPI */}
      <Card className="!bg-surface-raised !border-surface-border !ring-0">
        <Text className="!text-text-muted">Task Completion</Text>
        <Metric className="!text-text-primary">
          {TASK_COMPLETION.completed}/{TASK_COMPLETION.total}
        </Metric>
        <Flex className="mt-2">
          <Text className="!text-text-muted">
            {Math.round(
              (TASK_COMPLETION.completed / TASK_COMPLETION.total) * 100,
            )}
            %
          </Text>
        </Flex>
        <ProgressBar
          value={(TASK_COMPLETION.completed / TASK_COMPLETION.total) * 100}
          className="mt-2"
        />
      </Card>

      {/* Pipeline Bar Chart */}
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <div className="mb-2 text-xs font-medium text-text-secondary">
          Pipeline by Stage
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={PIPELINE_DATA} barSize={18}>
            <XAxis
              dataKey="stage"
              tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-overlay)",
                border: "1px solid var(--color-surface-border)",
                borderRadius: 8,
                color: "var(--color-text-primary)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {PIPELINE_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chamber Donut */}
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <div className="mb-2 text-xs font-medium text-text-secondary">
          Vaults by Chamber
        </div>
        <div className="flex items-center justify-between">
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie
                data={CHAMBER_DATA}
                dataKey="value"
                innerRadius={28}
                outerRadius={42}
                paddingAngle={3}
                strokeWidth={0}
              >
                {CHAMBER_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 text-[11px]">
            {CHAMBER_DATA.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-text-secondary">{d.name}</span>
                <span className="ml-auto font-medium text-text-primary">
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Wire into Dispatch page**

In `apps/web/src/app/(shell)/page.tsx`, add dynamic import at the top (after other imports):

```tsx
import dynamic from "next/dynamic";
const DispatchCharts = dynamic(
  () => import("@/components/organisms/DispatchCharts"),
  { ssr: false },
);
```

Then find the "Command Center" section in the Control panel (the right panel with Active Vaults / Unread Alerts / Recent Events metrics). Add `<DispatchCharts />` below the existing events list, just before the closing `</div>` of the control panel section.

**Step 3: Verify**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && cd /Users/zacharyholwerda/Desktop/airlock-app && pnpm type-check
```

**Step 4: Commit**

```bash
git add apps/web/src/components/organisms/DispatchCharts.tsx apps/web/src/app/(shell)/page.tsx
git commit -m "feat(web): add Recharts + Tremor analytics to Dispatch dashboard"
```

---

### Task 2: Calendar — Replace MonthGrid with FullCalendar

**Files:**

- Create: `apps/web/src/components/organisms/FullCalendarView.tsx`
- Modify: `apps/web/src/app/(shell)/(modules)/calendar/month/page.tsx`

**Context:** The Calendar module has a custom `MonthGrid` organism. We'll create a `FullCalendarView` organism wrapping `@fullcalendar/react` with day/week/month/list views, then swap it into the month page. The existing `CalendarEvent` type and `MOCK_CALENDAR_EVENTS` mock data will feed it.

**Step 1: Create the FullCalendarView organism**

Create `apps/web/src/components/organisms/FullCalendarView.tsx`:

```tsx
"use client";

import { useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarEvent } from "@/lib/mock-calendar";

interface FullCalendarViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateClick?: (dateStr: string) => void;
  onEventClick?: (eventId: string) => void;
}

export default function FullCalendarView({
  events,
  currentDate,
  onDateClick,
  onEventClick,
}: FullCalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.date,
    backgroundColor: e.dotColor || "var(--color-accent-primary)",
    borderColor: "transparent",
    textColor: "var(--color-text-primary)",
    extendedProps: { source: e.source, eventType: e.eventType },
  }));

  const handleDateClick = useCallback(
    (info: { dateStr: string }) => {
      onDateClick?.(info.dateStr);
    },
    [onDateClick],
  );

  const handleEventClick = useCallback(
    (info: { event: { id: string } }) => {
      onEventClick?.(info.event.id);
    },
    [onEventClick],
  );

  return (
    <div className="full-calendar-dark rounded-lg border border-surface-border bg-surface-raised p-4">
      <style jsx global>{`
        .full-calendar-dark .fc {
          --fc-border-color: var(--color-surface-border);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: var(--color-surface-overlay);
          --fc-list-event-hover-bg-color: var(--color-surface-overlay);
          --fc-today-bg-color: rgba(
            var(--color-accent-primary-rgb, 99, 102, 241),
            0.08
          );
          --fc-event-text-color: var(--color-text-primary);
          font-family: inherit;
        }
        .full-calendar-dark .fc-toolbar-title {
          color: var(--color-text-primary) !important;
          font-size: 1rem !important;
          font-weight: 600 !important;
        }
        .full-calendar-dark .fc-button {
          background: var(--color-surface-overlay) !important;
          border-color: var(--color-surface-border) !important;
          color: var(--color-text-secondary) !important;
          font-size: 0.75rem !important;
          padding: 0.25rem 0.5rem !important;
        }
        .full-calendar-dark .fc-button-active {
          background: var(--color-accent-primary) !important;
          color: white !important;
        }
        .full-calendar-dark .fc-col-header-cell-cushion,
        .full-calendar-dark .fc-daygrid-day-number,
        .full-calendar-dark .fc-list-day-text,
        .full-calendar-dark .fc-list-day-side-text {
          color: var(--color-text-secondary) !important;
          font-size: 0.75rem !important;
        }
        .full-calendar-dark .fc-daygrid-event {
          border-radius: 4px !important;
          font-size: 0.7rem !important;
          padding: 1px 4px !important;
        }
        .full-calendar-dark .fc-scrollgrid {
          border-color: var(--color-surface-border) !important;
        }
      `}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={currentDate}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        events={fcEvents}
        editable={false}
        selectable
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        dayMaxEvents={3}
        height="auto"
      />
    </div>
  );
}
```

**Step 2: Wire into Calendar month page**

Replace the contents of `apps/web/src/app/(shell)/(modules)/calendar/month/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useCalendarStore } from "@/stores/calendar.store";
import type { CalendarEventSource } from "@/lib/mock-calendar";
import CalendarDayModal from "@/components/organisms/CalendarDayModal";

const FullCalendarView = dynamic(
  () => import("@/components/organisms/FullCalendarView"),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 animate-pulse rounded-lg bg-surface-raised" />
    ),
  },
);

const SOURCES: { id: CalendarEventSource | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "contracts", label: "Contracts" },
  { id: "tasks", label: "Tasks" },
  { id: "crm", label: "CRM" },
  { id: "calendar", label: "Calendar" },
];

export default function CalendarMonthPage() {
  const {
    fetchEvents,
    isLoading,
    currentDate,
    sourceFilter,
    setSourceFilter,
    getFilteredEvents,
  } = useCalendarStore();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const events = getFilteredEvents();

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-4 p-6">
      {/* Header + filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Calendar</h1>
          <p className="text-xs text-text-muted">{events.length} events</p>
        </div>
        <div className="flex items-center gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSourceFilter(s.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sourceFilter === s.id
                  ? "bg-accent-primary text-white"
                  : "bg-surface-overlay text-text-secondary hover:text-text-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading events...</p>
        </div>
      ) : (
        <FullCalendarView
          events={events}
          currentDate={currentDate}
          onDateClick={(dateStr) => setSelectedDate(dateStr)}
        />
      )}

      {/* Day modal */}
      {selectedDate && (
        <CalendarDayModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
```

**Step 3: Verify**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
```

**Step 4: Commit**

```bash
git add apps/web/src/components/organisms/FullCalendarView.tsx apps/web/src/app/(shell)/(modules)/calendar/month/page.tsx
git commit -m "feat(calendar): replace MonthGrid with FullCalendar (month/week/list views)"
```

---

### Task 3: Triage — Add Gantt Timeline View

**Files:**

- Create: `apps/web/src/components/organisms/TasksGantt.tsx`
- Create: `apps/web/src/app/(shell)/(modules)/tasks/timeline/page.tsx`
- Modify: `apps/web/src/app/(shell)/(modules)/tasks/layout.tsx` (add Timeline nav link if layout exists, otherwise skip)

**Context:** The Tasks module has Board (Kanban), Table, and Inbox views. We'll add a Timeline view using frappe-gantt. Tasks with due dates become Gantt bars. The existing `MOCK_TASKS` from `mock-tasks.ts` provide the data — each task has `dueAt` and `createdAt` timestamps.

**Step 1: Create the TasksGantt organism**

Create `apps/web/src/components/organisms/TasksGantt.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { Task } from "@/lib/mock-tasks";

interface TasksGanttProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export default function TasksGantt({ tasks, onTaskClick }: TasksGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const tasksWithDates = tasks.filter((t) => t.dueAt && t.createdAt);
    if (tasksWithDates.length === 0) return;

    const ganttTasks = tasksWithDates.map((t) => ({
      id: t.id,
      name: t.title.length > 40 ? t.title.slice(0, 37) + "..." : t.title,
      start: t.createdAt.split("T")[0],
      end: t.dueAt!.split("T")[0],
      progress:
        t.status === "resolved"
          ? 100
          : t.status === "in_progress"
            ? 50
            : t.status === "in_review"
              ? 75
              : 0,
    }));

    // Dynamic import since frappe-gantt doesn't support SSR
    import("frappe-gantt").then(({ default: Gantt }) => {
      // Clear previous instance
      if (containerRef.current) containerRef.current.innerHTML = "";

      const svgEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      containerRef.current?.appendChild(svgEl);

      ganttRef.current = new Gantt(svgEl, ganttTasks, {
        view_mode: "Week",
        date_format: "YYYY-MM-DD",
        language: "en",
        on_click: (task: { id: string }) => {
          onTaskClick?.(task.id);
        },
      });
    });

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [tasks, onTaskClick]);

  const tasksWithDates = tasks.filter((t) => t.dueAt && t.createdAt);

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-text-muted">
          No tasks with dates for timeline view
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4 overflow-x-auto">
      <style jsx global>{`
        .gantt .grid-background {
          fill: transparent !important;
        }
        .gantt .grid-header {
          fill: var(--color-surface-overlay) !important;
          stroke: var(--color-surface-border) !important;
        }
        .gantt .grid-row {
          fill: transparent !important;
        }
        .gantt .grid-row:nth-child(even) {
          fill: rgba(255, 255, 255, 0.02) !important;
        }
        .gantt .row-line {
          stroke: var(--color-surface-border) !important;
        }
        .gantt .tick {
          stroke: var(--color-surface-border) !important;
        }
        .gantt .today-highlight {
          fill: rgba(
            var(--color-accent-primary-rgb, 99, 102, 241),
            0.08
          ) !important;
        }
        .gantt .bar {
          fill: var(--color-accent-primary) !important;
          stroke: none !important;
        }
        .gantt .bar-progress {
          fill: var(--color-accent-success) !important;
        }
        .gantt .bar-label {
          fill: var(--color-text-primary) !important;
          font-size: 11px !important;
        }
        .gantt .lower-text,
        .gantt .upper-text {
          fill: var(--color-text-muted) !important;
          font-size: 11px !important;
        }
        .gantt .handle-group .handle {
          fill: var(--color-accent-primary) !important;
        }
      `}</style>
      <div ref={containerRef} />
    </div>
  );
}
```

**Step 2: Create the Timeline page**

Create `apps/web/src/app/(shell)/(modules)/tasks/timeline/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTasksStore } from "@/stores/tasks.store";
import TaskDetailModal from "@/components/organisms/TaskDetailModal";

const TasksGantt = dynamic(() => import("@/components/organisms/TasksGantt"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-lg bg-surface-raised" />
  ),
});

export default function TasksTimelinePage() {
  const { tasks, fetchTasks, isLoading } = useTasksStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Timeline</h1>
          <p className="text-xs text-text-muted">
            Gantt view of tasks with due dates
          </p>
        </div>
        <span className="rounded-full bg-chamber-build/15 px-3 py-1 text-xs font-medium text-chamber-build">
          Build
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading tasks...</p>
        </div>
      ) : (
        <TasksGantt tasks={tasks} onTaskClick={(id) => setSelectedTaskId(id)} />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
```

**Step 3: Verify**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
```

**Step 4: Commit**

```bash
git add apps/web/src/components/organisms/TasksGantt.tsx apps/web/src/app/(shell)/(modules)/tasks/timeline/page.tsx
git commit -m "feat(tasks): add Gantt timeline view with frappe-gantt"
```

---

### Task 4: CRM Health — Add Pipeline Charts (Recharts)

**Files:**

- Modify: `apps/web/src/app/(shell)/(modules)/crm/health/page.tsx`

**Context:** The CRM Health page shows health cards with progress bars and risk factors. We'll add a Recharts bar chart showing health scores across all accounts and a trend sparkline. The existing `MOCK_CRM_HEALTH` data already has `healthScore` and `trend` fields.

**Step 1: Update the health page with charts**

In `apps/web/src/app/(shell)/(modules)/crm/health/page.tsx`, add imports at the top:

```tsx
import dynamic from "next/dynamic";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
```

Then add a chart section between the header and the grid. Insert this after the closing `</div>` of the header section and before the grid `<div className="grid gap-4 ...">`:

```tsx
{
  /* Health Score Chart */
}
<div className="rounded-lg border border-surface-border bg-surface-raised p-4">
  <div className="mb-3 text-xs font-medium text-text-secondary">
    Account Health Scores
  </div>
  <ResponsiveContainer width="100%" height={140}>
    <BarChart
      data={MOCK_CRM_HEALTH.map((c) => ({
        name: c.accountName.split(" ")[0],
        score: c.healthScore,
        trend: c.trend,
      }))}
      barSize={32}
    >
      <XAxis
        dataKey="name"
        tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis domain={[0, 100]} hide />
      <Tooltip
        contentStyle={{
          background: "var(--color-surface-overlay)",
          border: "1px solid var(--color-surface-border)",
          borderRadius: 8,
          color: "var(--color-text-primary)",
          fontSize: 12,
        }}
        formatter={(value: number) => [`${value}%`, "Health"]}
      />
      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
        {MOCK_CRM_HEALTH.map((c, i) => (
          <Cell
            key={i}
            fill={
              c.healthScore >= 80
                ? "var(--color-accent-success)"
                : c.healthScore >= 60
                  ? "var(--color-accent-warning)"
                  : "var(--color-accent-danger)"
            }
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>;
```

**Step 2: Verify**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
```

**Step 3: Commit**

```bash
git add apps/web/src/app/(shell)/(modules)/crm/health/page.tsx
git commit -m "feat(crm): add Recharts health score bar chart to CRM Health view"
```

---

### Task 5: Documents — Add Spreadsheet View (FortuneSheet)

**Files:**

- Create: `apps/web/src/components/organisms/SpreadsheetView.tsx`
- Modify: `apps/web/src/app/(shell)/(modules)/documents/library/page.tsx`

**Context:** The Documents module has a table view and preview. We'll add a "Spreadsheet" toggle that renders documents in a FortuneSheet grid — showing file metadata (title, type, status, size, date) in an Excel-like editable grid. This uses existing `MOCK_DOCUMENTS` data.

**Step 1: Create the SpreadsheetView organism**

Create `apps/web/src/components/organisms/SpreadsheetView.tsx`:

```tsx
"use client";

import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import type { Document } from "@/lib/mock-documents";
import { formatFileSize } from "@/lib/mock-documents";

interface SpreadsheetViewProps {
  documents: Document[];
}

export default function SpreadsheetView({ documents }: SpreadsheetViewProps) {
  const celldata = documents.flatMap((doc, rowIndex) => {
    const row = rowIndex + 1; // Row 0 is header
    const cells = [
      doc.title,
      doc.fileName,
      doc.fileFormat.toUpperCase(),
      doc.documentType,
      doc.status,
      formatFileSize(doc.fileSizeBytes),
      doc.uploadedByName,
      doc.vaultName || "—",
      new Date(doc.updatedAt).toLocaleDateString(),
    ];
    return cells.map((value, colIndex) => ({
      r: row,
      c: colIndex,
      v: { v: value, m: String(value) },
    }));
  });

  // Add header row
  const headers = [
    "Title",
    "File Name",
    "Format",
    "Type",
    "Status",
    "Size",
    "Uploaded By",
    "Vault",
    "Updated",
  ];
  const headerCells = headers.map((h, colIndex) => ({
    r: 0,
    c: colIndex,
    v: { v: h, m: h, bl: 1 },
  }));

  const sheetData = [
    {
      name: "Documents",
      celldata: [...headerCells, ...celldata],
      config: {
        columnlen: {
          0: 220,
          1: 200,
          2: 60,
          3: 90,
          4: 70,
          5: 80,
          6: 100,
          7: 140,
          8: 100,
        },
      },
      row: documents.length + 1,
      column: 9,
    },
  ];

  return (
    <div className="h-[500px] rounded-lg border border-surface-border overflow-hidden">
      <style jsx global>{`
        .fortune-sheet-container {
          background: var(--color-surface-raised) !important;
        }
        .luckysheet-cell-input {
          color: var(--color-text-primary) !important;
        }
      `}</style>
      <Workbook data={sheetData} />
    </div>
  );
}
```

**Step 2: Wire into Documents library page**

In `apps/web/src/app/(shell)/(modules)/documents/library/page.tsx`:

Add dynamic import at the top:

```tsx
import dynamic from "next/dynamic";
import { LayoutGrid, Table2 } from "lucide-react";

const SpreadsheetView = dynamic(
  () => import("@/components/organisms/SpreadsheetView"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] animate-pulse rounded-lg bg-surface-raised" />
    ),
  },
);
```

Add a view toggle state alongside existing state:

```tsx
const [viewMode, setViewMode] = useState<"table" | "spreadsheet">("table");
```

Add toggle buttons next to the "New Document" button in the header:

```tsx
<div className="flex items-center gap-1 rounded-lg border border-surface-border p-0.5">
  <button
    onClick={() => setViewMode("table")}
    className={`rounded-md p-1.5 transition-colors ${viewMode === "table" ? "bg-surface-overlay text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
    title="Table view"
  >
    <Table2 size={14} />
  </button>
  <button
    onClick={() => setViewMode("spreadsheet")}
    className={`rounded-md p-1.5 transition-colors ${viewMode === "spreadsheet" ? "bg-surface-overlay text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
    title="Spreadsheet view"
  >
    <LayoutGrid size={14} />
  </button>
</div>
```

Then in the document table section, conditionally render:

```tsx
{viewMode === "spreadsheet" ? (
  <SpreadsheetView documents={documents} />
) : (
  <div className={selectedDoc ? "flex-1 min-w-0" : "w-full"}>
    <DocumentsTable ... />
  </div>
)}
```

**Step 3: Verify**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
```

**Step 4: Commit**

```bash
git add apps/web/src/components/organisms/SpreadsheetView.tsx apps/web/src/app/(shell)/(modules)/documents/library/page.tsx
git commit -m "feat(documents): add FortuneSheet spreadsheet view toggle"
```

---

### Task 6: Contracts — Add Vault Lifecycle Gantt

**Files:**

- Create: `apps/web/src/components/organisms/VaultGantt.tsx`
- Modify: `apps/web/src/app/(shell)/(modules)/contracts/triage/page.tsx`

**Context:** The Contracts triage page shows a grid of vault cards. We'll add a Gantt timeline below the grid showing vault lifecycle progression — each vault as a bar from `created_at` to `updated_at`, colored by chamber. Uses existing `vaults` from `vault.store`.

**Step 1: Create the VaultGantt organism**

Create `apps/web/src/components/organisms/VaultGantt.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

interface VaultForGantt {
  id: string;
  name: string;
  slug: string;
  chamber: string;
  created_at: string;
  updated_at: string;
  health_score?: number | null;
}

interface VaultGanttProps {
  vaults: VaultForGantt[];
  onVaultClick?: (slug: string) => void;
}

const CHAMBER_COLORS: Record<string, string> = {
  discover: "#ef4444",
  build: "#eab308",
  review: "#a855f7",
  ship: "#22c55e",
};

export default function VaultGantt({ vaults, onVaultClick }: VaultGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || vaults.length === 0) return;

    const ganttTasks = vaults.map((v) => ({
      id: v.id,
      name: v.name.length > 35 ? v.name.slice(0, 32) + "..." : v.name,
      start: v.created_at.split("T")[0],
      end: v.updated_at.split("T")[0],
      progress: v.health_score ?? 0,
      custom_class: `vault-chamber-${v.chamber}`,
    }));

    import("frappe-gantt").then(({ default: Gantt }) => {
      if (containerRef.current) containerRef.current.innerHTML = "";

      const svgEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      containerRef.current?.appendChild(svgEl);

      new Gantt(svgEl, ganttTasks, {
        view_mode: "Month",
        date_format: "YYYY-MM-DD",
        language: "en",
        on_click: (task: { id: string }) => {
          const vault = vaults.find((v) => v.id === task.id);
          if (vault) onVaultClick?.(vault.slug);
        },
      });
    });

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [vaults, onVaultClick]);

  if (vaults.length === 0) return null;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4 overflow-x-auto">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          Vault Lifecycle Timeline
        </span>
        <div className="flex items-center gap-3">
          {Object.entries(CHAMBER_COLORS).map(([chamber, color]) => (
            <div key={chamber} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] capitalize text-text-muted">
                {chamber}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style jsx global>{`
        .gantt .grid-background {
          fill: transparent !important;
        }
        .gantt .grid-header {
          fill: var(--color-surface-overlay) !important;
          stroke: var(--color-surface-border) !important;
        }
        .gantt .grid-row {
          fill: transparent !important;
        }
        .gantt .row-line {
          stroke: var(--color-surface-border) !important;
        }
        .gantt .tick {
          stroke: var(--color-surface-border) !important;
        }
        .gantt .bar-label {
          fill: var(--color-text-primary) !important;
          font-size: 11px !important;
        }
        .gantt .lower-text,
        .gantt .upper-text {
          fill: var(--color-text-muted) !important;
          font-size: 11px !important;
        }
        .vault-chamber-discover .bar {
          fill: #ef4444 !important;
        }
        .vault-chamber-build .bar {
          fill: #eab308 !important;
        }
        .vault-chamber-review .bar {
          fill: #a855f7 !important;
        }
        .vault-chamber-ship .bar {
          fill: #22c55e !important;
        }
        .vault-chamber-discover .bar-progress {
          fill: #dc2626 !important;
        }
        .vault-chamber-build .bar-progress {
          fill: #ca8a04 !important;
        }
        .vault-chamber-review .bar-progress {
          fill: #9333ea !important;
        }
        .vault-chamber-ship .bar-progress {
          fill: #16a34a !important;
        }
      `}</style>
      <div ref={containerRef} />
    </div>
  );
}
```

**Step 2: Wire into Contracts triage page**

In `apps/web/src/app/(shell)/(modules)/contracts/triage/page.tsx`:

Add imports:

```tsx
import dynamic from "next/dynamic";

const VaultGantt = dynamic(() => import("@/components/organisms/VaultGantt"), {
  ssr: false,
});
```

Add the Gantt timeline below the vault cards grid (after the closing `</div>` of the grid section, before the final `</div>`):

```tsx
{
  /* Vault Lifecycle Timeline */
}
{
  !isLoading && discoverVaults.length > 0 && (
    <VaultGantt
      vaults={discoverVaults}
      onVaultClick={(slug) => router.push(`/contracts/${slug}`)}
    />
  );
}
```

**Step 3: Verify**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
```

**Step 4: Commit**

```bash
git add apps/web/src/components/organisms/VaultGantt.tsx apps/web/src/app/(shell)/(modules)/contracts/triage/page.tsx
git commit -m "feat(contracts): add vault lifecycle Gantt timeline to triage view"
```

---

## Summary

| Task | Module    | Package           | What It Does                                            |
| ---- | --------- | ----------------- | ------------------------------------------------------- |
| 1    | Dispatch  | Recharts + Tremor | Pipeline bar chart, chamber donut, task KPI card        |
| 2    | Calendar  | FullCalendar      | Month/week/list views with drag, event dots, dark theme |
| 3    | Triage    | Frappe Gantt      | Gantt timeline of tasks with due dates                  |
| 4    | CRM       | Recharts          | Health score bar chart color-coded by risk              |
| 5    | Documents | FortuneSheet      | Excel-like spreadsheet view toggle                      |
| 6    | Contracts | Frappe Gantt      | Vault lifecycle timeline colored by chamber             |

**After all 6 tasks:** Run `pnpm type-check && pnpm lint` to verify everything passes, then push.
