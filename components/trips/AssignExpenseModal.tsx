"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Luggage, Tag } from "lucide-react";
import GlassButton from "@/components/glass/GlassButton";
import GlassModal from "@/components/glass/GlassModal";
import GlassSelect from "@/components/glass/GlassSelect";
import { Field } from "@/components/glass/GlassInput";
import TripCategoryIcon from "@/components/trips/TripCategoryIcon";
import { formatCurrency } from "@/lib/format";
import { formatFullDate } from "@/lib/month";
import { linkTripExpense } from "@/lib/tracker-client";
import {
  TRIP_CATEGORIES,
  type Transaction,
  type Trip,
  type TripCategory,
} from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The expense being filed. */
  transaction: Transaction | null;
  trips: Trip[];
  /** Pre-selected when the expense was dropped onto a particular trip. */
  defaultTripId?: string;
  /** Set when the expense is already on a trip and is being re-filed. */
  currentCategory?: TripCategory;
  onSaved: (message: string) => void;
}

/**
 * Files one trip expense against a trip, under a trip-level category.
 *
 * The same dialog serves the drag-and-drop path and the tap path: dropping an
 * expense on a trip opens it with that trip pre-selected, while the "Add to
 * trip" button opens it with the trip still to choose. Drag-and-drop does not
 * exist on touch screens, so the button is the one that has to work
 * everywhere — the dragging is a shortcut on top, not the only way in.
 */
export default function AssignExpenseModal({
  open,
  onClose,
  transaction,
  trips,
  defaultTripId,
  currentCategory,
  onSaved,
}: Props) {
  const [tripId, setTripId] = useState("");
  const [category, setCategory] = useState<TripCategory | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTripId(defaultTripId ?? trips[0]?.id ?? "");
    setCategory(currentCategory ?? "");
    setError(null);
  }, [open, defaultTripId, currentCategory, trips]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!transaction) return;
    if (!tripId) return setError("Pick a trip.");
    if (!category) return setError("Pick what this was spent on.");

    setSaving(true);
    try {
      await linkTripExpense({
        trip_id: tripId,
        transaction_id: transaction.id,
        trip_category: category,
      });
      onSaved(currentCategory ? "Expense updated" : "Added to trip");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={currentCategory ? "Change trip details" : "Add to trip"}
      subtitle="The expense stays where it is — this just files it under a trip."
      size="sm"
      footer={
        <div className="flex gap-3">
          <GlassButton variant="glass" block onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            form="assign-expense-form"
            variant="primary"
            block
            disabled={saving}
          >
            {saving ? "Saving…" : currentCategory ? "Save" : "Add to trip"}
          </GlassButton>
        </div>
      }
    >
      <form id="assign-expense-form" onSubmit={handleSubmit} className="space-y-4 pb-1">
        {transaction && (
          <div className="rounded-2xl border border-glass bg-white/40 px-4 py-3 dark:bg-white/[0.05]">
            <p className="truncate text-sm font-medium text-text-primary">
              {transaction.description}
            </p>
            <p className="tnum mt-0.5 text-xs text-text-tertiary">
              {formatFullDate(transaction.expense_date)} · {transaction.account} ·{" "}
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        )}

        <Field label="Trip" htmlFor="assign-trip">
          <GlassSelect
            id="assign-trip"
            icon={<Luggage />}
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
          >
            <option value="" disabled>
              Select a trip
            </option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.place}
              </option>
            ))}
          </GlassSelect>
        </Field>

        <Field label="Spent on" htmlFor="assign-category">
          <GlassSelect
            id="assign-category"
            icon={category ? <TripCategoryIcon category={category} /> : <Tag />}
            value={category}
            onChange={(e) => setCategory(e.target.value as TripCategory)}
          >
            <option value="" disabled>
              Select a category
            </option>
            {TRIP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </GlassSelect>
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
