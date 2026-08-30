"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { MONTH_ABBR, currentMonthKey, formatMonthKey, shiftMonthKey } from "@/lib/month";
import Popover from "./Popover";

interface Props {
  /** "YYYY-MM" */
  value: string;
  onChange: (monthKey: string) => void;
  className?: string;
  /** Blocks stepping past the current month. */
  maxIsToday?: boolean;
}

/**
 * Month selector: arrows for stepping one month at a time (the common case)
 * and a tap on the label for a year grid (the rare case).
 */
export default function MonthPicker({
  value,
  onChange,
  className,
  maxIsToday = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [panelYear, setPanelYear] = useState(() => Number(value.slice(0, 4)));
  const labelRef = useRef<HTMLButtonElement>(null);
  const dismiss = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setPanelYear(Number(value.slice(0, 4)));
  }, [value]);

  const today = currentMonthKey();
  const nextDisabled = maxIsToday && shiftMonthKey(value, 1) > today;

  const arrowClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-secondary " +
    "transition-colors duration-150 hover:bg-text-primary/5 hover:text-text-primary " +
    "disabled:pointer-events-none disabled:opacity-35";

  return (
    <div
      className={clsx(
        "glass-subtle relative flex items-center rounded-2xl border border-glass p-1",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange(shiftMonthKey(value, -1))}
        aria-label="Previous month"
        className={arrowClass}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      <button
        ref={labelRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="min-w-[132px] rounded-xl px-2 py-1.5 text-sm font-semibold tracking-tight text-text-primary transition-colors duration-150 hover:bg-text-primary/5"
      >
        {formatMonthKey(value)}
      </button>

      <button
        type="button"
        onClick={() => onChange(shiftMonthKey(value, 1))}
        disabled={nextDisabled}
        aria-label="Next month"
        className={arrowClass}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>

      <Popover
        open={open}
        anchorRef={labelRef}
        onDismiss={dismiss}
        align="left"
        className="glass-strong glass-lit w-[268px] rounded-2xl p-3 shadow-modal animate-fade-in"
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPanelYear((y) => y - 1)}
            aria-label="Previous year"
            className={arrowClass}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="tnum text-sm font-semibold text-text-primary">{panelYear}</span>
          <button
            type="button"
            onClick={() => setPanelYear((y) => y + 1)}
            aria-label="Next year"
            className={arrowClass}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {MONTH_ABBR.map((abbr, i) => {
            const key = `${panelYear}-${String(i + 1).padStart(2, "0")}`;
            const selected = key === value;
            const disabled = maxIsToday && key > today;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={clsx(
                  "rounded-xl py-2 text-[13px] font-medium transition-colors duration-150",
                  "disabled:pointer-events-none disabled:opacity-30",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-text-secondary hover:bg-text-primary/5 hover:text-text-primary"
                )}
              >
                {abbr}
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}
