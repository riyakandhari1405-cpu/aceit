"use client";

import { useEffect, useState } from "react";

function prefersStill() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CountUp({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  const [shown, setShown] = useState(prefersStill() ? value ?? 0 : 0);
  useEffect(() => {
    if (value === null) return;
    if (prefersStill()) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 720);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  if (value === null) return <span>—</span>;
  return (
    <span className="tabular-nums">
      {shown}
      {suffix}
    </span>
  );
}

export function ScoreRing({
  value,
  label,
  detail,
}: {
  value: number | null;
  label: string;
  detail: string;
}) {
  const amount = value ?? 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const ready = amount >= 85;
  return (
    <div className="glass lift flex items-center gap-4 rounded-2xl p-4">
      <svg viewBox="0 0 108 108" className="h-[5.5rem] w-[5.5rem] shrink-0" aria-hidden>
        <circle cx="54" cy="54" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        <circle
          cx="54"
          cy="54"
          r={radius}
          fill="none"
          stroke={ready ? "var(--accent)" : "var(--copper)"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="ring-draw"
          style={{
            ["--ring-start" as string]: String(circumference),
            ["--ring-offset" as string]: String(circumference - (Math.max(0, Math.min(100, amount)) / 100) * circumference),
          }}
          transform="rotate(-90 54 54)"
        />
      </svg>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          <CountUp value={value} suffix={value === null ? "" : "%"} />
        </p>
        <p className="mt-1 truncate text-sm text-muted">{detail}</p>
      </div>
    </div>
  );
}

export function Meter({ label, value }: { label: string; value: number }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">
          <CountUp value={value} />
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div className="bar-fill h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
