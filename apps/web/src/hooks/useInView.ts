"use client";

import { useRef, useState, useEffect } from "react";

/**
 * Returns a ref and a boolean that becomes true (and stays true) once the
 * referenced element enters the viewport. Useful for triggering one-shot
 * entrance animations as lists scroll into view.
 *
 * Usage:
 *   const { ref, isInView } = useInView();
 *   <ul ref={ref}>
 *     {items.map((item, i) => (
 *       <li
 *         className={isInView ? "animate-fade-slide-up" : "opacity-0"}
 *         style={{ animationDelay: `${i * 60}ms` }}
 *       />
 *     ))}
 *   </ul>
 */
export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options },
    );

    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, isInView };
}
