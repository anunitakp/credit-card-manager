"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, CreditCard, Smartphone } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import GlassButton from "@/components/glass/GlassButton";
import GlassInput, { Field } from "@/components/glass/GlassInput";
import GlassModal from "@/components/glass/GlassModal";
import GlassSelect from "@/components/glass/GlassSelect";
import SegmentedControl from "@/components/glass/SegmentedControl";
import { fetchCurrentCycle, createExpense } from "@/lib/api-client";
import { createUpiExpense, updateUpiExpense } from "@/lib/tracker-client";
import { CATEGORIES, Category, Account, Transaction } from "@/lib/types";
import { todayIso } from "@/lib/month";
import { formatCurrency } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing UPI transaction. */
  initial?: Transaction | null;
  onSaved: (message: string) => void;
}

interface FormState {
  description: string;
  amount: string;
  category: Category | "";
  account: Account;
  date: string;
}

function emptyForm(): FormState {
  return {
    description: "",
    amount: "",
    category: "",
    account: "UPI",
    date: todayIso(),
  };
}

/**
 * The add/edit expense sheet.
 *
 * Choosing "Credit Card" does not create a second copy of anything — it
 * writes straight into the Credit Card Manager's current billing cycle, the
 * same table the card manager itself uses. Either entry point, one row.
 */
export default function AddExpenseModal({ open, onClose, initial, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editing = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setForm({
        description: initial.description,
        amount: String(initial.amount),
        category: initial.category,
        account: initial.account,
        date: initial.expense_date,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initial]);

  const amountValue = Number(form.amount);
  const amountPreview =
    form.amount !== "" && Number.isFinite(amountValue) && amountValue > 0
      ? formatCurrency(amountValue)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.description.trim()) return setError("Please describe the expense.");
    if (!form.category) return setError("Please pick a category.");
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return setError("Please enter an amount greater than zero.");
    }
    if (!form.date) return setError("Please choose a date.");

    setSubmitting(true);

    try {
      if (editing && initial) {
        await updateUpiExpense(initial.id, {
          description: form.description.trim(),
          category: form.category,
          amount: amountValue,
          expense_date: form.date,
        });
        onSaved("Expense updated");
      } else if (form.account === "UPI") {
        await createUpiExpense({
          description: form.description.trim(),
          category: form.category,
          amount: amountValue,
          expense_date: form.date,
        });
        onSaved("Expense added");
      } else {
        // Credit-card expenses live in the card manager's current cycle, so
        // that the card statement and the tracker are literally the same rows.
        const { cycle } = await fetchCurrentCycle();
        await createExpense(cycle.id, {
          expense_name: form.description.trim(),
          category: form.category,
          total_amount: amountValue,
          others_amount: 0,
          expense_date: form.date,
        });
        onSaved("Expense added to your credit card cycle");
      }
      onClose();
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
      title={editing ? "Edit Expense" : "Add Expense"}
      subtitle={
        editing
          ? "Changes apply everywhere this expense appears."
          : "Logged against the date you choose."
      }
      footer={
        <div className="flex gap-3">
          <GlassButton type="button" variant="glass" block onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            form="add-expense-form"
            variant="primary"
            block
            disabled={submitting}
          >
            {submitting ? "Saving…" : editing ? "Save Changes" : "Add Expense"}
          </GlassButton>
        </div>
      }
    >
      <form id="add-expense-form" onSubmit={handleSubmit} className="space-y-4 pb-1">
        <Field label="Expense" htmlFor="expense-description">
          <GlassInput
            id="expense-description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Dinner at Zaitoon"
            autoComplete="off"
          />
        </Field>

        <Field label="Amount" htmlFor="expense-amount">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-tertiary">
              ₹
            </span>
            <input
              id="expense-amount"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0"
              className="tnum h-16 w-full rounded-2xl border border-glass bg-white/45 pl-10 pr-4 text-3xl font-semibold tracking-tight text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary/50 hover:border-primary/30 focus:border-primary/60 focus:bg-white/70 focus:ring-4 focus:ring-primary/10 dark:bg-white/[0.05] dark:focus:bg-white/[0.09]"
            />
          </div>
          {amountPreview && (
            <p className="mt-1.5 text-xs text-text-tertiary tnum">{amountPreview}</p>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="expense-category">
            <GlassSelect
              id="expense-category"
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

          <Field label="Date" htmlFor="expense-date">
            <GlassInput
              id="expense-date"
              type="date"
              icon={<CalendarDays />}
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </Field>
        </div>

        <Field
          label="Paid with"
          hint={
            editing
              ? undefined
              : form.account === "Credit Card"
                ? "Saved into your current credit-card billing cycle."
                : undefined
          }
        >
          {editing ? (
            <div className="flex h-11 items-center gap-2 rounded-xl border border-glass bg-white/45 px-3.5 text-sm text-text-secondary dark:bg-white/[0.05]">
              {form.account === "UPI" ? (
                <Smartphone className="h-4 w-4" aria-hidden />
              ) : (
                <CreditCard className="h-4 w-4" aria-hidden />
              )}
              {form.account}
            </div>
          ) : (
            <SegmentedControl<Account>
              ariaLabel="Payment account"
              block
              value={form.account}
              onChange={(account) => setForm((f) => ({ ...f, account }))}
              segments={[
                { value: "UPI", label: "UPI", icon: <Smartphone className="h-3.5 w-3.5" /> },
                {
                  value: "Credit Card",
                  label: "Credit Card",
                  icon: <CreditCard className="h-3.5 w-3.5" />,
                },
              ]}
            />
          )}
        </Field>

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
