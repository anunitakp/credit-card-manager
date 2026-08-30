"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { fieldShell } from "./GlassInput";

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
  invalid?: boolean;
}

/**
 * A native `<select>` in glass clothing. Native is deliberate: on mobile it
 * gets the platform wheel picker, which is faster than any custom listbox
 * and is what makes "add an expense in under ten seconds" achievable.
 */
const GlassSelect = forwardRef<HTMLSelectElement, Props>(function GlassSelect(
  { icon, invalid, className, children, ...rest },
  ref
) {
  return (
    <div className="relative w-full">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      )}
      <select
        ref={ref}
        className={clsx(
          fieldShell,
          "h-11 cursor-pointer appearance-none pr-9",
          icon && "pl-10",
          invalid && "border-danger/60 focus:border-danger focus:ring-danger/10",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
        aria-hidden
      />
    </div>
  );
});

export default GlassSelect;
