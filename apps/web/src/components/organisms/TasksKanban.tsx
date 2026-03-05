"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  KANBAN_COLUMNS,
  TASK_STATUS_CONFIG,
  type Task,
  type TaskStatus,
} from "@/lib/mock-tasks";
import TaskCard from "@/components/molecules/TaskCard";

interface TasksKanbanProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}

export default function TasksKanban({ tasks, onMoveTask }: TasksKanbanProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;
    if (result.source.droppableId !== newStatus) {
      onMoveTask(taskId, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const statusCfg = TASK_STATUS_CONFIG[col.id];

          return (
            <div key={col.id} className="w-[300px] flex-shrink-0">
              {/* Column header */}
              <div className="mb-2 flex items-center justify-between rounded-lg bg-surface-overlay px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusCfg.color}`} />
                  <span className="text-xs font-semibold text-text-primary">
                    {col.label}
                  </span>
                  <span className="rounded-full bg-surface-border px-1.5 py-0.5 text-[10px] text-text-muted">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Droppable column */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex min-h-[200px] flex-col gap-2 rounded-lg border p-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? "border-accent-primary/40 bg-accent-primary/5"
                        : "border-surface-border-subtle bg-surface-sunken/50"
                    }`}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <TaskCard task={task} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
