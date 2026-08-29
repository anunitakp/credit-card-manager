"use client";

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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface-elevated p-5 shadow-modal animate-modal-in">
        <div className="flex items-start gap-3">
          <span
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              destructive ? "bg-danger-bg" : "bg-primary-tint"
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
            className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-surface-hover"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={clsx(
              "h-10 flex-1 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors duration-150 disabled:opacity-60",
              destructive ? "bg-danger hover:brightness-95" : "bg-primary hover:bg-primary-hover"
            )}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
