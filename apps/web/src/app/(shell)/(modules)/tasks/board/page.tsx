"use client";

import { useEffect } from "react";
import { useTasksStore } from "@/stores/tasks.store";
import TasksKanban from "@/components/organisms/TasksKanban";

export default function TasksBoardPage() {
  const { fetchTasks, tasks, moveTask, isLoading } = useTasksStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Kanban Board
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Drag tasks between columns to update status
          </p>
        </div>
        <span className="rounded-full bg-chamber-build/20 px-3 py-1 text-xs font-medium text-chamber-build">
          Build
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading tasks...</p>
        </div>
      ) : (
        <TasksKanban tasks={tasks} onMoveTask={moveTask} />
      )}
    </div>
  );
}
