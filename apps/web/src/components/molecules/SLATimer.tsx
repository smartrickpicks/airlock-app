"use client";

import { useState, useEffect } from "react";

interface SLATimerProps {
  deadline: string | null;
  paused?: boolean;
  className?: string;
}

function getTimeRemaining(deadline: string): number {
  return new Date(deadline).getTime() - Date.now();
}

function formatTime(ms: number): string {
  const negative = ms < 0;
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1_000);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${negative ? "-" : ""}${hh}:${mm}:${ss}`;
}

function getTimerColor(ms: number): string {
  if (ms < 0) return "text-gate-red";
  if (ms < 5 * 60_000) return "text-gate-red";
  if (ms < 15 * 60_000) return "text-gate-red";
  if (ms < 60 * 60_000) return "text-gate-amber";
  return "text-gate-green";
}

function getRingColor(ms: number): string {
  if (ms < 0) return "stroke-gate-red";
  if (ms < 15 * 60_000) return "stroke-gate-red";
  if (ms < 60 * 60_000) return "stroke-gate-amber";
  return "stroke-gate-green";
}

export default function SLATimer({ deadline, paused, className }: SLATimerProps) {
  const [remaining, setRemaining] = useState<number | null>(
    deadline ? getTimeRemaining(deadline) : null,
  );

  useEffect(() => {
    if (!deadline || paused) return;
    setRemaining(getTimeRemaining(deadline));
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(deadline));
    }, 1_000);
    return () => clearInterval(interval);
  }, [deadline, paused]);

  if (!deadline) {
    return (
      <span className={`font-mono text-xs text-text-muted ${className ?? ""}`}>
        No deadline
      </span>
    );
  }

  if (paused) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <span className="font-mono text-xs text-text-muted">
          {remaining !== null ? formatTime(remaining) : "--:--:--"}
        </span>
        <span className="rounded bg-text-muted/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">
          Paused
        </span>
      </div>
    );
  }

  const ms = remaining ?? 0;
  const timerColor = getTimerColor(ms);
  const ringColor = getRingColor(ms);
  const shouldPulse = ms > 0 && ms < 5 * 60_000;

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const totalMs = 24 * 60 * 60_000;
  const progress = Math.max(0, Math.min(1, ms / totalMs));
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className="relative h-12 w-12 flex-shrink-0">
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-surface-border"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={`${ringColor} transition-all duration-1000`}
          />
        </svg>
      </div>
      <span
        className={`font-mono text-sm font-bold ${timerColor} ${shouldPulse ? "animate-pulse" : ""}`}
      >
        {formatTime(ms)}
      </span>
    </div>
  );
}
