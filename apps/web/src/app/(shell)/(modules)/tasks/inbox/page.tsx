"use client";

import { useEffect } from "react";
import { useTasksStore } from "@/stores/tasks.store";
import TasksTable from "@/components/organisms/TasksTable";

export default function TasksInboxPage() {
  const { fetchTasks, isLoading } = useTasksStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Default inbox: show non-resolved/non-dismissed tasks
  const allTasks = useTasksStore((s) => s.tasks);
  const openTasks = allTasks.filter(
    (t) => t.status !== "resolved" && t.status !== "dismissed",
  );

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Inbox</h1>
          <p className="mt-1 text-sm text-text-secondary">
            All open tasks across every module
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/20 px-3 py-1 text-xs font-medium text-accent-primary">
          Tasks
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading tasks...</p>
        </div>
      ) : (
        <TasksTable
          tasks={openTasks}
          title="Inbox"
          subtitle={`${openTasks.length} open tasks`}
        />
      )}
    </div>
  );
}
