"use client";

import { forwardRef } from "react";
import clsx from "clsx";

export const fieldShell =
  "w-full rounded-xl border border-glass bg-white/45 px-3.5 text-sm text-text-primary " +
  "placeholder:text-text-tertiary shadow-none outline-none transition-all duration-200 " +
  "backdrop-blur-sm dark:bg-white/[0.05] " +
  "hover:border-primary/30 focus:border-primary/60 focus:bg-white/70 " +
  "focus:ring-4 focus:ring-primary/10 dark:focus:bg-white/[0.09]";

/**
 * Label + control + error, so every form row in the app lines up the same
 * way without each page re-inventing the spacing.
 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("min-w-0", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary"
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon rendered inside the left edge of the field. */
  icon?: React.ReactNode;
  invalid?: boolean;
}

const GlassInput = forwardRef<HTMLInputElement, InputProps>(function GlassInput(
  { icon, invalid, className, ...rest },
  ref
) {
  return (
    <div className="relative w-full">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={clsx(
          fieldShell,
          "h-11",
          icon && "pl-10",
          invalid && "border-danger/60 focus:border-danger focus:ring-danger/10",
          className
        )}
        {...rest}
      />
    </div>
  );
});

export default GlassInput;

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function GlassTextarea({ invalid, className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={clsx(
          fieldShell,
          "min-h-[104px] resize-y py-3 leading-relaxed",
          invalid && "border-danger/60 focus:border-danger focus:ring-danger/10",
          className
        )}
        {...rest}
      />
    );
  }
);

