"use client";

import { useState, type MouseEventHandler } from "react";

type Orientation = "vertical" | "horizontal";

interface ResizeHandleProps {
  onDragStart: MouseEventHandler<HTMLDivElement>;
  orientation?: Orientation;
  className?: string;
}

export default function ResizeHandle({
  onDragStart,
  orientation = "vertical",
  className,
}: ResizeHandleProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isVertical = orientation === "vertical";

  return (
    <div
      className={`
        ${isVertical ? "w-1 h-full cursor-col-resize" : "h-1 w-full cursor-row-resize"}
        relative flex items-center justify-center
        select-none
        group
        ${className ?? ""}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={onDragStart}
      role="separator"
      aria-orientation={orientation}
    >
      <div
        className={`
          ${isVertical ? "w-px h-full" : "h-px w-full"}
          transition-colors duration-fast
          ${isHovered ? "bg-accent-primary" : "bg-surface-border"}
        `}
      />
    </div>
  );
}
