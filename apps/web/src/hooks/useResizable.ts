"use client";

import { useCallback, useRef, useEffect } from "react";

interface UseResizableOptions {
  /** Current width of the panel in px */
  currentWidth: number;
  /** Minimum panel width in px */
  minWidth?: number;
  /** Maximum panel width in px */
  maxWidth?: number;
  /** Which side the resize handle is on (determines drag direction) */
  direction: "left" | "right";
  /** Callback to update width in the store */
  onResize: (width: number) => void;
}

/**
 * Hook that manages mouse drag state for panel resizing.
 *
 * Returns `onDragStart` — pass it to <ResizeHandle onDragStart={...} />.
 * During drag, cursor changes to col-resize and the panel width updates
 * in real time via the `onResize` callback.
 */
export function useResizable({
  currentWidth,
  minWidth = 200,
  maxWidth = 600,
  direction,
  onResize,
}: UseResizableOptions) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;

      const delta = e.clientX - startX.current;
      const multiplier = direction === "right" ? 1 : -1;
      const newWidth = startWidth.current + delta * multiplier;
      const clamped = Math.min(maxWidth, Math.max(minWidth, newWidth));

      onResize(clamped);
    },
    [direction, minWidth, maxWidth, onResize],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  // Attach/detach global listeners
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = currentWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [currentWidth],
  );

  return { onDragStart };
}
