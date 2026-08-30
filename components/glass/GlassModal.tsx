"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Pinned to the bottom of the modal, outside the scroll area. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "max-w-[420px]",
  md: "max-w-[560px]",
  lg: "max-w-[760px]",
};

/**
 * Bottom sheet on mobile, centred dialog on desktop.
 *
 * Rendered into `document.body` so the overlay is never trapped inside the
 * stacking context of a glass card, and so its backdrop blur frosts the whole
 * page rather than a rectangle of it.
 */
export default function GlassModal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  size = "md",
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // `onClose` is almost always an inline arrow function, so it is a new value
  // on every render of the parent. Keeping it in a ref lets the effect below
  // depend on `open` alone.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first focusable control so keyboard and screen-reader users
    // land inside the dialog rather than behind it.
    //
    // This effect MUST depend on `open` alone. When it also depended on
    // `onClose` it re-ran on every keystroke, and the timeout below yanked
    // focus back to the first control — which is why typing an amount died
    // after a single character.
    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        "input, textarea, select, button, [tabindex]:not([tabindex='-1'])"
      );
      target?.focus();
    }, 60);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(6_14_20_/_0.45)] backdrop-blur-md animate-fade-in sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={clsx(
          "glass-strong glass-lit flex max-h-[92vh] w-full flex-col overflow-hidden",
          "rounded-t-3xl shadow-modal animate-sheet-in sm:rounded-3xl sm:animate-modal-in",
          SIZE[size]
        )}
      >
        {/* Grab handle — mobile affordance for the sheet */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-text-tertiary/40" aria-hidden />
        </div>

        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-text-primary">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-text-secondary">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-tertiary transition-colors duration-150 hover:bg-text-primary/5 hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-glass px-5 py-4 sm:px-7">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
