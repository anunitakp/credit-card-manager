"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, Category, Expense, ExpenseInput } from "@/lib/types";
import { formatCurrency, todayIsoDate } from "@/lib/format";

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

  if (!open) return null;

  const total = Number(form.total_amount) || 0;
  const others = Number(form.others_amount) || 0;
  const mySpending = Math.max(0, total - others);

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
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {initial ? "Edit Expense" : "Add Expense"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Expense</label>
            <input
              type="text"
              value={form.expense_name}
              onChange={(e) => setForm((f) => ({ ...f, expense_name: e.target.value }))}
              placeholder="e.g. Dinner at Absolute Barbecue"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Total Amount (₹)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.total_amount}
                onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                placeholder="1250"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Others Pay (₹)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.others_amount}
                onChange={(e) => setForm((f) => ({ ...f, others_amount: e.target.value }))}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            My Spending:{" "}
            <span className="font-semibold text-brand-700">{formatCurrency(mySpending)}</span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Expense Date</label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "Saving…" : initial ? "Save Changes" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
