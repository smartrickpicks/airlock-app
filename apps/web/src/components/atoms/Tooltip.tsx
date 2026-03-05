"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

type TooltipPosition = "right" | "top";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
}

export default function Tooltip({
  content,
  children,
  position = "right",
  delay = 300,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShouldRender(true);
      // Allow a frame for the element to mount before triggering fade-in
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
    // Wait for fade-out transition before unmounting
    setTimeout(() => {
      setShouldRender(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses: Record<TooltipPosition, string> = {
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {shouldRender && (
        <div
          className={`
            absolute ${positionClasses[position]}
            bg-surface-overlay border border-surface-border rounded-md
            px-3 py-1.5
            text-sm text-text-primary whitespace-nowrap
            z-tooltip
            transition-opacity duration-fast
            pointer-events-none
            ${isVisible ? "opacity-100" : "opacity-0"}
          `}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
