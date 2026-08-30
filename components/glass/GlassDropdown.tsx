"use client";

import { useCallback, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import Popover from "./Popover";

export interface DropdownOption {
  value: string;
  label: string;
  /** Small colour swatch, used for category options. */
  swatch?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  /** Shown when `value` matches the all-values sentinel. */
  placeholder: string;
  /** The value that means "no filter". Defaults to the empty string. */
  allValue?: string;
  icon?: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}

/**
 * A filter chip that opens a glass popover.
 *
 * Distinct from GlassSelect: this is for *filters*, where the chip should
 * visibly light up once it is narrowing the data, so an unexpectedly empty
 * list is always explainable by looking at the toolbar.
 */
export default function GlassDropdown({
  value,
  onChange,
  options,
  placeholder,
  allValue = "",
  icon,
  className,
  align = "left",
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dismiss = useCallback(() => setOpen(false), []);

  const active = value !== allValue;
  const selected = options.find((o) => o.value === value);

  return (
    <div className={clsx("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(
          "flex h-9 w-full items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium",
          "transition-all duration-200 active:scale-[0.98] focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/30",
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-glass bg-white/45 text-text-secondary hover:text-text-primary dark:bg-white/[0.05]"
        )}
      >
        {icon && <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
        {selected?.swatch && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: selected.swatch }}
            aria-hidden
          />
        )}
        <span className="truncate">{active ? (selected?.label ?? value) : placeholder}</span>
        <ChevronDown
          className={clsx(
            "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      <Popover
        open={open}
        anchorRef={triggerRef}
        onDismiss={dismiss}
        align={align}
        matchWidth
        className="glass-strong glass-lit w-max overflow-y-auto rounded-2xl p-1.5 shadow-modal animate-fade-in"
      >
        <div role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px]",
                  "transition-colors duration-150",
                  isSelected
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-text-secondary hover:bg-text-primary/5 hover:text-text-primary"
                )}
              >
                {option.swatch && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: option.swatch }}
                    aria-hidden
                  />
                )}
                <span className="whitespace-nowrap">{option.label}</span>
                {isSelected && <Check className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}
