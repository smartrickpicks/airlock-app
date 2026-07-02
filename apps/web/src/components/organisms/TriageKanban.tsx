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
  SEVERITY_CONFIG,
  type Task,
  type TaskStatus,
} from "@/lib/mock-tasks";

interface TriageKanbanProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}

function formatDue(
  dueAt: string | null,
): { text: string; color: string } | null {
  if (!dueAt) return null;
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 0)
    return {
      text: `${Math.abs(diffHours)}h overdue`,
      color: "text-accent-danger",
    };
  if (diffHours < 24)
    return { text: `${diffHours}h left`, color: "text-amber-400" };
  const diffDays = Math.round(diffHours / 24);
  return { text: `${diffDays}d left`, color: "text-text-muted" };
}

export default function TriageKanban({ tasks, onMoveTask }: TriageKanbanProps) {
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
                    {colTasks.map((task, index) => {
                      const severity = SEVERITY_CONFIG[task.severity];
                      const due = formatDue(task.dueAt);

                      return (
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
                              className="rounded-lg border border-surface-border bg-surface-raised p-3 cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-colors duration-fast"
                            >
                              {/* Title + severity dot */}
                              <div className="flex items-start gap-2">
                                <span
                                  className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${severity.dotColor}`}
                                />
                                <span className="text-sm font-medium text-text-primary line-clamp-2">
                                  {task.title}
                                </span>
                              </div>

                              {/* Vault name */}
                              {task.vaultName && (
                                <div className="mt-1.5 text-xs text-text-muted">
                                  {task.vaultName}
                                </div>
                              )}

                              {/* Severity badge + assignee + due */}
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${severity.color}`}
                                  >
                                    {severity.label}
                                  </span>
                                  <span className="text-xs text-text-secondary">
                                    {task.assignedToName || (
                                      <span className="italic text-text-muted">
                                        Unassigned
                                      </span>
                                    )}
                                  </span>
                                </div>
                                {due && (
                                  <span
                                    className={`font-mono text-[10px] ${due.color}`}
                                  >
                                    {due.text}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
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
