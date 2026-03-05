"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  PIPELINE_STAGES,
  type CrmDeal,
  type PipelineStage,
} from "@/lib/mock-crm";
import DealCard from "@/components/molecules/DealCard";

interface PipelineBoardProps {
  deals: CrmDeal[];
  onMoveDeal: (dealId: string, newStage: PipelineStage) => void;
}

export default function PipelineBoard({
  deals,
  onMoveDeal,
}: PipelineBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId as PipelineStage;
    if (result.source.droppableId !== newStage) {
      onMoveDeal(dealId, newStage);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.id);
          const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-[280px]">
              {/* Column header */}
              <div className="mb-2 flex items-center justify-between rounded-lg bg-surface-overlay px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stage.color}`} />
                  <span className="text-xs font-semibold text-text-primary">
                    {stage.label}
                  </span>
                  <span className="rounded-full bg-surface-border px-1.5 py-0.5 text-[10px] text-text-muted">
                    {stageDeals.length}
                  </span>
                </div>
              </div>

              {/* Droppable column */}
              <Droppable droppableId={stage.id}>
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
                    {stageDeals.map((deal, index) => (
                      <Draggable
                        key={deal.id}
                        draggableId={deal.id}
                        index={index}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <DealCard deal={deal} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Column footer — total value */}
              <div className="mt-2 text-center text-xs text-text-muted">
                ${totalValue.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
