"use client";

import clsx from "clsx";

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  segments: Segment<T>[];
  size?: "sm" | "md";
  block?: boolean;
  ariaLabel: string;
  className?: string;
}

/**
 * Glass segmented control. The selected pill is a real element rather than a
 * background colour on the button, so it can slide between options — the
 * movement is what makes the switch feel physical instead of instant.
 */
export default function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  size = "md",
  block = false,
  ariaLabel,
  className,
}: Props<T>) {
  const index = Math.max(
    0,
    segments.findIndex((s) => s.value === value)
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx(
        "glass-subtle relative isolate flex rounded-xl p-1",
        "border border-glass",
        block ? "w-full" : "w-fit",
        className
      )}
    >
      {/* Sliding selection pill */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 -z-10 rounded-lg bg-white/85 shadow-card transition-transform duration-300 ease-out dark:bg-white/[0.13]"
        style={{
          width: `calc((100% - 0.5rem) / ${segments.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(segment.value)}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium",
              "transition-colors duration-200 focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-[13px]",
              active ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {segment.icon}
            <span className="truncate">{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
