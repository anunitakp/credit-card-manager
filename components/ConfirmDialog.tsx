"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import clsx from "clsx";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  // Mounted on the body so it is never trapped inside a glass card's
  // stacking context, and so its blur frosts the whole page.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[rgb(6_14_20_/_0.45)] p-4 backdrop-blur-md animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="glass-strong glass-lit w-full max-w-sm rounded-3xl p-5 shadow-modal animate-modal-in">
        <div className="flex items-start gap-3">
          <span
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              destructive ? "bg-danger/10" : "bg-primary/10"
            )}
          >
            <AlertTriangle
              className={clsx("h-4 w-4", destructive ? "text-danger" : "text-primary")}
              aria-hidden
            />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-glass bg-white/45 text-sm font-medium text-text-primary transition-all duration-200 active:scale-[0.97] hover:bg-white/70 dark:bg-white/[0.05] dark:hover:bg-white/[0.09]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={clsx(
              "h-11 flex-1 rounded-xl text-sm font-semibold text-white shadow-card transition-all duration-200 active:scale-[0.97] disabled:opacity-60",
              destructive ? "bg-danger hover:brightness-95" : "bg-primary hover:bg-primary-hover"
            )}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
