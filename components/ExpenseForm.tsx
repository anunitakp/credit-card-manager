"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays } from "lucide-react";
import CategoryIcon from "./CategoryIcon";
import GlassButton from "./glass/GlassButton";
import GlassInput, { Field } from "./glass/GlassInput";
import GlassModal from "./glass/GlassModal";
import GlassSelect from "./glass/GlassSelect";
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

/**
 * The credit-card expense form.
 *
 * Unlike a UPI expense, a card expense can be partly someone else's — the
 * "others pay" split is what makes `my_spending` the figure the expense
 * tracker counts, so the split is shown resolving live as you type.
 */
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
      setForm({ ...emptyForm, expense_date: todayIsoDate() });
    }
    setError(null);
  }, [open, initial]);

  const total = Number(form.total_amount) || 0;
  const others = Number(form.others_amount) || 0;
  const mySpending = Math.max(0, total - others);
  const othersExceedTotal = form.others_amount !== "" && others > total;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.expense_name.trim()) return setError("Please enter an expense name.");
    if (!form.category) return setError("Please select a category.");

    const totalAmount = Number(form.total_amount);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return setError("Total amount must be a number of 0 or more.");
    }
    const othersAmount = form.others_amount === "" ? 0 : Number(form.others_amount);
    if (!Number.isFinite(othersAmount) || othersAmount < 0) {
      return setError("Amount paid by others must be a number of 0 or more.");
    }
    if (othersAmount > totalAmount) {
      return setError("Amount paid by others cannot exceed the total.");
    }
    if (!form.expense_date) return setError("Please choose an expense date.");

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
    <GlassModal
      open={open}
      onClose={onClose}
      title={initial ? "Edit Card Expense" : "Add Card Expense"}
      subtitle="Recorded against your credit-card billing cycle."
      footer={
        <div className="flex gap-3">
          <GlassButton type="button" variant="glass" block onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            form="card-expense-form"
            variant="primary"
            block
            disabled={submitting}
          >
            {submitting ? "Saving…" : initial ? "Save Changes" : "Add Expense"}
          </GlassButton>
        </div>
      }
    >
      <form id="card-expense-form" onSubmit={handleSubmit} className="space-y-4 pb-1">
        <Field label="Expense" htmlFor="card-expense-name">
          <GlassInput
            id="card-expense-name"
            value={form.expense_name}
            onChange={(e) => setForm((f) => ({ ...f, expense_name: e.target.value }))}
            placeholder="e.g. Dinner at Absolute Barbecue"
            autoComplete="off"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Total Amount" htmlFor="card-expense-total">
            <GlassInput
              id="card-expense-total"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className="tnum"
              icon={<span className="text-sm font-semibold">₹</span>}
              value={form.total_amount}
              onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
              placeholder="1,250"
            />
          </Field>

          <Field
            label="Others Pay"
            htmlFor="card-expense-others"
            error={othersExceedTotal ? "More than the total." : undefined}
          >
            <GlassInput
              id="card-expense-others"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className="tnum"
              icon={<span className="text-sm font-semibold">₹</span>}
              invalid={othersExceedTotal}
              value={form.others_amount}
              onChange={(e) => setForm((f) => ({ ...f, others_amount: e.target.value }))}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-glass bg-primary/[0.07] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-secondary">Your share</p>
            <p className="mt-0.5 text-xs text-text-tertiary">Counted by the expense tracker</p>
          </div>
          <span className="tnum text-xl font-semibold text-primary">
            {formatCurrency(mySpending)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="card-expense-category">
            <GlassSelect
              id="card-expense-category"
              value={form.category}
              icon={form.category ? <CategoryIcon category={form.category} /> : undefined}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
            >
              <option value="" disabled>
                Select category
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </GlassSelect>
          </Field>

          <Field label="Expense Date" htmlFor="card-expense-date">
            <GlassInput
              id="card-expense-date"
              type="date"
              icon={<CalendarDays />}
              value={form.expense_date}
              onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
            />
          </Field>
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </form>
    </GlassModal>
  );
}
