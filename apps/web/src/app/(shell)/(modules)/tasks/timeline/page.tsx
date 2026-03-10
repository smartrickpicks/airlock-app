"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTasksStore } from "@/stores/tasks.store";

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

      {selectedTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedTaskId(null)}
        >
          <div
            className="rounded-lg border border-surface-border bg-surface-raised p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">
                Task Detail
              </h2>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="text-text-muted hover:text-text-primary text-sm"
              >
                ✕
              </button>
            </div>
            {(() => {
              const task = tasks.find((t) => t.id === selectedTaskId);
              if (!task)
                return (
                  <p className="text-sm text-text-muted">Task not found</p>
                );
              return (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-text-primary">
                    {task.title}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {task.description}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded bg-surface-overlay px-2 py-0.5 text-text-secondary">
                      {task.status}
                    </span>
                    <span className="rounded bg-surface-overlay px-2 py-0.5 text-text-secondary">
                      {task.severity}
                    </span>
                    <span className="rounded bg-surface-overlay px-2 py-0.5 text-text-secondary">
                      {task.moduleType}
                    </span>
                  </div>
                  {task.dueAt && (
                    <div className="text-xs text-text-muted">
                      Due: {new Date(task.dueAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
