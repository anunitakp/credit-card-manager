"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type Tone = "primary" | "warning" | "danger" | "neutral";

const TRACK = "bg-text-primary/[0.07] dark:bg-white/[0.07]";

const FILL: Record<Tone, string> = {
  primary: "bg-gradient-to-r from-primary/80 to-primary",
  warning: "bg-gradient-to-r from-warning/70 to-warning",
  danger: "bg-gradient-to-r from-danger/70 to-danger",
  neutral: "bg-text-secondary/60",
};

interface Props {
  /** 0–100. Values above 100 are clamped for the bar but not for the label. */
  value: number;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Animate from zero on mount. */
  animate?: boolean;
  label?: string;
}

const HEIGHT = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" };

export default function ProgressBar({
  value,
  tone = "primary",
  size = "md",
  className,
  animate = true,
  label,
}: Props) {
  const target = Math.max(0, Math.min(100, value));
  // Start at zero and grow on mount, so a bar reads as "filling up" rather
  // than appearing pre-filled.
  const [width, setWidth] = useState(animate ? 0 : target);

  useEffect(() => {
    if (!animate) {
      setWidth(target);
      return;
    }
    const frame = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={clsx("w-full overflow-hidden rounded-full", TRACK, HEIGHT[size], className)}
    >
      <div
        className={clsx("h-full rounded-full transition-[width] duration-700 ease-out", FILL[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/**
 * Circular variant, for the Budget page headline. Same tones, same clamping
 * rules, drawn as an SVG ring.
 */
export function ProgressRing({
  value,
  tone = "primary",
  size = 168,
  strokeWidth = 12,
  children,
}: {
  value: number;
  tone?: Tone;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const target = Math.max(0, Math.min(100, value));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  const stroke =
    tone === "danger"
      ? "rgb(var(--danger))"
      : tone === "warning"
        ? "rgb(var(--warning))"
        : "rgb(var(--primary))";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-text-primary/[0.08] dark:stroke-white/[0.08]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
