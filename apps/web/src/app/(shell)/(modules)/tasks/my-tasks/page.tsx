"use client";

import { useEffect } from "react";
import { useTasksStore } from "@/stores/tasks.store";
import TasksTable from "@/components/organisms/TasksTable";

export default function MyTasksPage() {
  const { fetchTasks, isLoading, currentUserId, tasks } = useTasksStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const myTasks = tasks.filter(
    (t) =>
      t.assignedTo === currentUserId &&
      t.status !== "resolved" &&
      t.status !== "dismissed",
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">My Tasks</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Tasks assigned to you
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
          tasks={myTasks}
          title="My Tasks"
          subtitle={`${myTasks.length} assigned to you`}
        />
      )}
    </div>
  );
}
