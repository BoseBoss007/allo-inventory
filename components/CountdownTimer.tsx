"use client";

import { useEffect, useState, useCallback } from "react";

interface Props {
  expiresAt: string;
  onExpired: () => void;
}

export function CountdownTimer({ expiresAt, onExpired }: Props) {
  const secondsLeft = useCallback(
    () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
    [expiresAt]
  );

  const [secs, setSecs] = useState(secondsLeft);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const s = secondsLeft();
      setSecs(s);
      if (s <= 0 && !fired) {
        setFired(true);
        onExpired();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [secondsLeft, onExpired, fired]);

  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  const progress = Math.max(0, secs / (10 * 60));
  const circumference = 2 * Math.PI * 28;
  const offset = circumference * (1 - progress);

  const urgent = secs <= 60;
  const critical = secs <= 30;

  const color = critical ? "stroke-red-500" : urgent ? "stroke-orange-500" : "stroke-violet-500";
  const textColor = critical ? "text-red-400" : urgent ? "text-orange-400" : "text-foreground";
  const bgClass = critical
    ? "border-red-500/40 bg-red-500/10"
    : urgent
    ? "border-orange-500/40 bg-orange-500/10"
    : "border-violet-500/20 bg-violet-500/5";

  return (
    <div className={`rounded-xl border p-4 transition-all duration-500 ${bgClass}`}>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-border/30" />
            <circle
              cx="32" cy="32" r="28" fill="none" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className={`transition-all duration-1000 ${color}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className={`h-5 w-5 ${textColor} ${critical ? "animate-pulse" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold tabular-nums ${textColor}`}>
              {String(mins).padStart(2, "0")}:{String(remainingSecs).padStart(2, "0")}
            </span>
            <span className="text-sm text-muted-foreground">remaining</span>
          </div>
          <p className={`text-xs mt-1 ${critical || urgent ? textColor : "text-muted-foreground"}`}>
            {critical
              ? "⚠️ Hurry — reservation expires very soon"
              : urgent
              ? "Less than 1 minute left — confirm now"
              : "Your stock is reserved. Complete payment before time runs out."}
          </p>
        </div>
      </div>
    </div>
  );
}
