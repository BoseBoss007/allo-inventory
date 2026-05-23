"use client";

import { useEffect, useState, useCallback } from "react";

interface CountdownTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

export function CountdownTimer({ expiresAt, onExpired }: CountdownTimerProps) {
  const getSecondsLeft = useCallback(() => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  }, [expiresAt]);

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const secs = getSecondsLeft();
      setSecondsLeft(secs);
      if (secs <= 0 && !expired) {
        setExpired(true);
        onExpired();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [getSecondsLeft, onExpired, expired]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const totalSeconds = Math.floor((new Date(expiresAt).getTime() - Date.now() + secondsLeft * 1000) / 1000);
  const initialDuration = 10 * 60; // 10 minutes
  const progress = Math.max(0, Math.min(1, secondsLeft / initialDuration));

  const isUrgent = secondsLeft <= 60;
  const isCritical = secondsLeft <= 30;

  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-500 ${
        isCritical
          ? "border-red-500/40 bg-red-500/10"
          : isUrgent
          ? "border-orange-500/40 bg-orange-500/10"
          : "border-violet-500/20 bg-violet-500/5"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Circular progress */}
        <div className="relative flex-shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-border/30"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-1000 ${
                isCritical
                  ? "stroke-red-500"
                  : isUrgent
                  ? "stroke-orange-500"
                  : "stroke-violet-500"
              }`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className={`h-5 w-5 ${
                isCritical
                  ? "text-red-400"
                  : isUrgent
                  ? "text-orange-400"
                  : "text-violet-400"
              } ${isCritical ? "animate-pulse" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-3xl font-bold tabular-nums ${
                isCritical
                  ? "text-red-400"
                  : isUrgent
                  ? "text-orange-400"
                  : "text-foreground"
              }`}
            >
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="text-sm text-muted-foreground">remaining</span>
          </div>
          <p
            className={`text-xs mt-1 ${
              isCritical
                ? "text-red-400"
                : isUrgent
                ? "text-orange-400"
                : "text-muted-foreground"
            }`}
          >
            {isCritical
              ? "⚠️ Hurry! Reservation expires very soon"
              : isUrgent
              ? "Less than 1 minute left — confirm now"
              : "Your cart is reserved. Complete payment before the timer runs out."}
          </p>
        </div>
      </div>
    </div>
  );
}
