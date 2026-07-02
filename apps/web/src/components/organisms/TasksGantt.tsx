"use client";

import { useEffect, useRef } from "react";
import type { Task } from "@/lib/mock-tasks";

interface TasksGanttProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export default function TasksGantt({ tasks, onTaskClick }: TasksGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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

    let mounted = true;

    // Dynamic import since frappe-gantt doesn't support SSR
    import("frappe-gantt").then((mod) => {
      if (!mounted || !container) return;

      const Gantt = mod.default || mod;
      // Clear previous instance
      container.innerHTML = "";

      const svgEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      container.appendChild(svgEl);

      try {
        new Gantt(svgEl, ganttTasks, {
          view_mode: "Week",
          date_format: "YYYY-MM-DD",
          language: "en",
          on_click: (task: { id: string }) => {
            onTaskClick?.(task.id);
          },
        });
      } catch (e) {
        console.warn("Gantt render error:", e);
      }
    });

    return () => {
      mounted = false;
      container.innerHTML = "";
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
      <div ref={containerRef} />
    </div>
  );
}
