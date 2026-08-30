"use client";

import { forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "glass" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-card hover:bg-primary-hover " +
    "focus-visible:ring-primary/40",
  glass:
    "glass-strong glass-lit text-text-primary hover:shadow-card-hover " +
    "focus-visible:ring-primary/30",
  ghost:
    "text-text-secondary hover:bg-text-primary/5 hover:text-text-primary " +
    "focus-visible:ring-primary/30",
  danger:
    "bg-danger text-white shadow-card hover:opacity-90 focus-visible:ring-danger/40",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-xl px-3 text-[13px]",
  md: "h-11 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-2xl px-5 text-[15px]",
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Stretches to the full width of its container. */
  block?: boolean;
}

/**
 * The one button in the app. Every variant shares the same press-scale and
 * focus ring, so the whole interface responds to touch identically.
 */
const GlassButton = forwardRef<HTMLButtonElement, Props>(function GlassButton(
  { variant = "glass", size = "md", block = false, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex select-none items-center justify-center font-medium",
        "transition-all duration-200 ease-out active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default GlassButton;
