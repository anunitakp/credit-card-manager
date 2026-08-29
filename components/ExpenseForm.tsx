"use client";

import { useEffect, useState } from "react";
import { X, IndianRupee, Calendar, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { CATEGORIES, Category, Expense, ExpenseInput } from "@/lib/types";
import { formatCurrency, todayIsoDate } from "@/lib/format";
import CategoryIcon from "./CategoryIcon";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ExpenseInput) => Promise<void>;
  initial?: Expense | null;
}

const emptyForm = {
  expense_name: "",
  total_amount: "",
  others_amount: "",
  category: "" as Category | "",
  expense_date: todayIsoDate(),
};

const inputBase =
  "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function ExpenseForm({ open, onClose, onSubmit, initial }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        expense_name: initial.expense_name,
        total_amount: String(initial.total_amount),
        others_amount: String(initial.others_amount),
        category: initial.category,
        expense_date: initial.expense_date,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const total = Number(form.total_amount) || 0;
  const others = Number(form.others_amount) || 0;
  const mySpending = Math.max(0, total - others);
  const othersExceedTotal = form.others_amount !== "" && others > total;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.expense_name.trim()) {
      setError("Please enter an expense name.");
      return;
    }
    if (!form.category) {
      setError("Please select a category.");
      return;
    }
    const totalAmount = Number(form.total_amount);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      setError("Total amount must be a number greater than or equal to 0.");
      return;
    }
    const othersAmount = form.others_amount === "" ? 0 : Number(form.others_amount);
    if (!Number.isFinite(othersAmount) || othersAmount < 0) {
      setError("Amount to be paid by others must be a number greater than or equal to 0.");
      return;
    }
    if (othersAmount > totalAmount) {
      setError("Amount to be paid by others cannot be greater than the total amount.");
      return;
    }
    if (!form.expense_date) {
      setError("Please choose an expense date.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        expense_name: form.expense_name.trim(),
        category: form.category as Category,
        total_amount: totalAmount,
        others_amount: othersAmount,
        expense_date: form.expense_date,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-text-primary/40 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-form-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl bg-surface-elevated shadow-modal animate-sheet-in sm:rounded-2xl sm:animate-modal-in">
        <div className="flex items-start justify-between border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id="expense-form-title" className="text-lg font-semibold text-text-primary">
              {initial ? "Edit Expense" : "Add Expense"}
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Record a purchase from this billing cycle.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              Expense
            </label>
            <input
              type="text"
              value={form.expense_name}
              onChange={(e) => setForm((f) => ({ ...f, expense_name: e.target.value }))}
              placeholder="e.g. Dinner at Absolute Barbecue"
              className={clsx(inputBase, "border-border focus:border-primary")}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                Total Amount
              </label>
              <div className="relative">
                <IndianRupee
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"
                  aria-hidden
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={form.total_amount}
                  onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                  placeholder="1,250"
                  className={clsx(inputBase, "border-border pl-8 focus:border-primary")}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                Others Pay
              </label>
              <div className="relative">
                <IndianRupee
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"
                  aria-hidden
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={form.others_amount}
                  onChange={(e) => setForm((f) => ({ ...f, others_amount: e.target.value }))}
                  placeholder="0"
                  className={clsx(
                    inputBase,
                    "pl-8",
                    othersExceedTotal
                      ? "border-danger focus:border-danger focus:ring-danger/25"
                      : "border-border focus:border-primary"
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-primary-tint px-4 py-3">
            <span className="text-sm font-medium text-text-secondary">Your Share</span>
            <span className="text-xl font-semibold text-primary">
              {formatCurrency(mySpending)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                Category
              </label>
              <div className="relative">
                {form.category && (
                  <CategoryIcon
                    category={form.category as Category}
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"
                  />
                )}
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as Category }))
                  }
                  className={clsx(
                    inputBase,
                    "appearance-none border-border focus:border-primary",
                    form.category && "pl-8"
                  )}
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                Expense Date
              </label>
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"
                  aria-hidden
                />
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                  className={clsx(inputBase, "border-border pl-8 focus:border-primary")}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border bg-surface-elevated px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-lg border border-border text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? "Saving…" : initial ? "Save Changes" : "Add Expense"}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}
