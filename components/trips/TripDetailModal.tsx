"use client";

import { useMemo } from "react";
import { MapPin, Pencil, X } from "lucide-react";
import GlassModal from "@/components/glass/GlassModal";
import TripCategoryDonut from "@/components/trips/TripCategoryDonut";
import TripCategoryIcon from "@/components/trips/TripCategoryIcon";
import { tripCategoryColor } from "@/lib/category-meta";
import { formatCurrency } from "@/lib/format";
import { formatFullDate } from "@/lib/month";
import {
  TRIP_CATEGORIES,
  type Transaction,
  type Trip,
  type TripCategory,
  type TripExpenseLink,
} from "@/lib/types";
import { useIsDark } from "@/components/tracker/useIsDark";

interface Props {
  open: boolean;
  onClose: () => void;
  trip: Trip | null;
  /** The expenses filed against this trip, paired with their link. */
  entries: { transaction: Transaction; link: TripExpenseLink }[];
  onEditCategory: (transaction: Transaction, link: TripExpenseLink) => void;
  onRemove: (transaction: Transaction) => void;
}

/**
 * One trip, and everything spent on it.
 *
 * Grouped by trip category rather than listed flat: the useful question about
 * a holiday is "how much went on stay versus food", and a date-ordered list
 * of twenty rows answers that far less well than nine subtotals do.
 */
export default function TripDetailModal({
  open,
  onClose,
  trip,
  entries,
  onEditCategory,
  onRemove,
}: Props) {
  const total = useMemo(
    () => entries.reduce((sum, e) => sum + e.transaction.amount, 0),
    [entries]
  );

  // Categories in their declared order, skipping any with nothing in them,
  // so the breakdown reads the same way on every trip.
  const groups = useMemo(() => {
    const byCategory = new Map<TripCategory, typeof entries>();
    for (const entry of entries) {
      const list = byCategory.get(entry.link.trip_category) ?? [];
      list.push(entry);
      byCategory.set(entry.link.trip_category, list);
    }
    return TRIP_CATEGORIES.map((category) => ({
      category,
      items: byCategory.get(category) ?? [],
      subtotal: (byCategory.get(category) ?? []).reduce(
        (sum, e) => sum + e.transaction.amount,
        0
      ),
    })).filter((g) => g.items.length > 0);
  }, [entries]);

  const donutData = useMemo(
    () =>
      groups.map((g) => ({
        category: g.category,
        amount: g.subtotal,
        share: total > 0 ? (g.subtotal / total) * 100 : 0,
      })),
    [groups, total]
  );

  // Every filed expense, newest first — the flat list underneath the ring
  // answers "what exactly did I spend on", which a per-category grouping
  // makes you hunt for.
  const allEntries = useMemo(
    () =>
      [...entries].sort((a, b) =>
        b.transaction.expense_date.localeCompare(a.transaction.expense_date)
      ),
    [entries]
  );

  const dark = useIsDark();

  if (!trip) return null;

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={trip.place}
      subtitle={formatFullDate(trip.trip_date)}
      size="md"
    >
      <div className="pb-2">
        <div className="rounded-2xl border border-glass bg-white/40 px-4 py-4 dark:bg-white/[0.05]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
            Spent on this trip
          </p>
          <p className="tnum mt-1.5 text-[32px] font-semibold leading-none tracking-tight text-text-primary">
            {formatCurrency(total)}
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            {entries.length} {entries.length === 1 ? "expense" : "expenses"} filed
            {trip.total_amount > 0 && (
              <> · {formatCurrency(trip.total_amount)} recorded on the trip card</>
            )}
          </p>
        </div>

        {trip.notes && (
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-text-secondary">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden />
            {trip.notes}
          </p>
        )}

        {entries.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-glass px-4 py-8 text-center text-sm text-text-tertiary">
            Nothing filed against this trip yet. Drag a trip expense onto its card, or use
            &ldquo;Add to trip&rdquo;.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            {/* ------------------------------------------ Donut + legend */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="w-full max-w-[220px] shrink-0 sm:w-[220px]">
                <TripCategoryDonut data={donutData} total={total} className="h-[200px]" />
              </div>

              <ul className="w-full min-w-0 flex-1 space-y-2.5">
                {groups.map((group) => (
                  <li key={group.category} className="flex items-center gap-2.5">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: `${tripCategoryColor(group.category, dark)}26`,
                        color: tripCategoryColor(group.category, dark),
                      }}
                    >
                      <TripCategoryIcon category={group.category} className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {group.category}
                    </span>
                    <span className="tnum shrink-0 text-sm font-medium text-text-primary">
                      {formatCurrency(group.subtotal)}
                    </span>
                    <span className="tnum w-10 shrink-0 text-right text-xs text-text-tertiary">
                      {total > 0 ? Math.round((group.subtotal / total) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* --------------------------------------------- All expenses */}
            <section>
              <h3 className="mb-1.5 text-sm font-semibold text-text-primary">
                All transactions
              </h3>
              <ul className="divide-y divide-[color:var(--glass-border-soft)]">
                {allEntries.map(({ transaction, link }) => (
                  <li key={transaction.id} className="group flex items-center gap-3 py-2">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: `${tripCategoryColor(link.trip_category, dark)}26`,
                        color: tripCategoryColor(link.trip_category, dark),
                      }}
                    >
                      <TripCategoryIcon
                        category={link.trip_category}
                        className="h-4 w-4"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">
                        {transaction.description}
                      </p>
                      <p className="tnum mt-0.5 text-xs text-text-tertiary">
                        {formatFullDate(transaction.expense_date)} · {transaction.account} ·{" "}
                        {link.trip_category}
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-sm font-medium text-text-primary">
                      {formatCurrency(transaction.amount)}
                    </span>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => onEditCategory(transaction, link)}
                        aria-label={`Change category for ${transaction.description}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-text-primary/[0.06] hover:text-text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(transaction)}
                        aria-label={`Remove ${transaction.description} from this trip`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </GlassModal>
  );
}
