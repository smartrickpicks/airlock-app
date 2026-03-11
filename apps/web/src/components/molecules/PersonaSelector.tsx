"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { PERSONA_MODES } from "@/stores/otto.store";

interface PersonaSelectorProps {
  value: string | null;
  onChange: (mode: string | null) => void;
}

export default function PersonaSelector({
  value,
  onChange,
}: PersonaSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const activeLabel =
    PERSONA_MODES.find((m) => m.value === value)?.label ?? "Auto";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-full border border-surface-border bg-surface-overlay px-2 py-0.5 text-[10px] font-medium text-text-secondary hover:text-text-primary hover:border-accent-primary/30 transition-colors"
        aria-label="Select persona mode"
      >
        <span className="capitalize">{activeLabel}</span>
        <ChevronDown
          size={10}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[120px] rounded-lg border border-surface-border bg-surface-base py-1 shadow-lg">
          {PERSONA_MODES.map((mode) => (
            <button
              key={mode.label}
              onClick={() => {
                onChange(mode.value);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-1.5 text-left text-[11px] transition-colors ${
                value === mode.value
                  ? "text-accent-primary bg-accent-primary/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <span className="capitalize">{mode.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
