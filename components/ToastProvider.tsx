"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import clsx from "clsx";

export type ToastVariant = "success" | "error";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: number;
  leaving?: boolean;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;
const LEAVE_ANIMATION_MS = 180;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft: toasts are a nice-to-have, never worth crashing the app over.
    return { toast: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, LEAVE_ANIMATION_MS);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { ...input, id }]);
      setTimeout(() => remove(id), AUTO_DISMISS_MS);
    },
    [remove]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:bottom-4 sm:right-4 sm:left-auto"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={clsx(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 shadow-modal transition-all duration-200 ease-out",
              item.leaving ? "opacity-0 translate-y-1" : "animate-toast-in opacity-100"
            )}
          >
            {item.variant === "error" ? (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 truncate text-xs text-text-secondary">{item.description}</p>
              )}
            </div>
            <button
              onClick={() => remove(item.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md p-0.5 text-text-tertiary hover:bg-surface-hover hover:text-text-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
