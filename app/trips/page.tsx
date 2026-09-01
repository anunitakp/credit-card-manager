"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CalendarDays,
  GripVertical,
  Luggage,
  MapPin,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import ConfirmDialog from "@/components/ConfirmDialog";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import GlassDropdown from "@/components/glass/GlassDropdown";
import GlassInput, { Field, GlassTextarea } from "@/components/glass/GlassInput";
import GlassModal from "@/components/glass/GlassModal";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/ToastProvider";
import PageHeader from "@/components/tracker/PageHeader";
import { useTracker } from "@/components/tracker/TrackerProvider";
import AssignExpenseModal from "@/components/trips/AssignExpenseModal";
import TripDetailModal from "@/components/trips/TripDetailModal";
import { usePointerDrag } from "@/components/trips/usePointerDrag";
import { formatCurrency } from "@/lib/format";
import { formatFullDate, todayIso } from "@/lib/month";
import {
  createTrip,
  deleteTrip,
  fetchTripLinks,
  unlinkTripExpense,
  updateTrip,
} from "@/lib/tracker-client";
import { Transaction, Trip, TripCategory, TripExpenseLink } from "@/lib/types";

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Most spent" },
  { value: "amount-asc", label: "Least spent" },
];

interface FormState {
  trip_date: string;
  place: string;
  total_amount: string;
  notes: string;
}

function emptyForm(): FormState {
  return { trip_date: todayIso(), place: "", total_amount: "", notes: "" };
}

export default function TripsPage() {
  const { toast } = useToast();
  const { trips, transactions, loading, refreshTrips } = useTracker();

  /**
   * Which expense belongs to which trip. Fetched here rather than in the app
   * bootstrap: only this page needs it, and every other page would pay for it
   * on each navigation.
   */
  const [links, setLinks] = useState<TripExpenseLink[]>([]);
  const loadLinks = useCallback(async () => {
    try {
      setLinks(await fetchTripLinks());
    } catch {
      // Degrade to "nothing filed yet" rather than breaking the page: the
      // trips and the expenses both still render.
    }
  }, []);
  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  /* ------------------------------------------------------------ derived */

  const tripExpenses = useMemo(
    () => transactions.filter((t) => t.category === "Trip"),
    [transactions]
  );

  const linkByTransaction = useMemo(
    () => new Map(links.map((l) => [l.transaction_id, l])),
    [links]
  );

  const unassigned = useMemo(
    () => tripExpenses.filter((t) => !linkByTransaction.has(t.id)),
    [tripExpenses, linkByTransaction]
  );

  /** Expenses grouped by the trip they were filed against. */
  const entriesByTrip = useMemo(() => {
    const byId = new Map<string, { transaction: Transaction; link: TripExpenseLink }[]>();
    for (const t of tripExpenses) {
      const link = linkByTransaction.get(t.id);
      if (!link) continue;
      const list = byId.get(link.trip_id) ?? [];
      list.push({ transaction: t, link });
      byId.set(link.trip_id, list);
    }
    return byId;
  }, [tripExpenses, linkByTransaction]);

  const tripExpenseTotal = useMemo(
    () => tripExpenses.reduce((sum, t) => sum + t.amount, 0),
    [tripExpenses]
  );

  /* -------------------------------------------------------- assign flow */

  const [assigning, setAssigning] = useState<{
    transaction: Transaction;
    tripId?: string;
    category?: TripCategory;
  } | null>(null);

  const drag = usePointerDrag((transactionId, tripId) => {
    const transaction = tripExpenses.find((t) => t.id === transactionId);
    if (transaction) setAssigning({ transaction, tripId });
  });

  /** The row being dragged, so the ghost can show what is in flight. */
  const dragged = drag.dragId
    ? (tripExpenses.find((t) => t.id === drag.dragId) ?? null)
    : null;

  async function removeFromTrip(transaction: Transaction) {
    try {
      await unlinkTripExpense(transaction.id);
      await loadLinks();
      toast({ title: "Removed from trip", description: transaction.description });
    } catch (err) {
      toast({
        title: "Could not remove it",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    }
  }

  /* --------------------------------------------------------- trip detail */

  const [detailTripId, setDetailTripId] = useState<string | null>(null);
  const detailTrip = trips.find((t) => t.id === detailTripId) ?? null;

  /* ---------------------------------------------------------- trip form */

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date-desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Trip | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? trips.filter((t) => `${t.place} ${t.notes ?? ""}`.toLowerCase().includes(needle))
      : trips;

    const spent = (trip: Trip) =>
      (entriesByTrip.get(trip.id) ?? []).reduce((sum, e) => sum + e.transaction.amount, 0);

    const sorted = [...filtered];
    switch (sort) {
      case "date-asc":
        return sorted.sort((a, b) => a.trip_date.localeCompare(b.trip_date));
      case "amount-desc":
        return sorted.sort((a, b) => spent(b) - spent(a));
      case "amount-asc":
        return sorted.sort((a, b) => spent(a) - spent(b));
      default:
        return sorted.sort((a, b) => b.trip_date.localeCompare(a.trip_date));
    }
  }, [trips, query, sort, entriesByTrip]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function openEdit(trip: Trip) {
    setEditing(trip);
    setForm({
      trip_date: trip.trip_date,
      place: trip.place,
      total_amount: String(trip.total_amount),
      notes: trip.notes ?? "",
    });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.place.trim()) return setError("Where did you go?");
    if (!form.trip_date) return setError("Please choose a date.");

    const amount = form.total_amount.trim() === "" ? 0 : Number(form.total_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return setError("Recorded total must be a number of 0 or more.");
    }

    const payload = {
      trip_date: form.trip_date,
      place: form.place.trim(),
      total_amount: amount,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateTrip(editing.id, payload);
        toast({ title: "Trip updated", description: payload.place });
      } else {
        await createTrip(payload);
        toast({ title: "Trip added", description: payload.place });
      }
      await refreshTrips();
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteTrip(deleting.id);
      await refreshTrips();
      // Its links went with it via the cascade, so re-read: the expenses it
      // held should reappear in the unfiled list rather than vanish.
      await loadLinks();
      toast({ title: "Trip deleted", description: deleting.place });
      setDeleting(null);
    } catch (err) {
      toast({
        title: "Could not delete this trip",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  /* -------------------------------------------------------------- render */

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Trips"
        eyebrow="Travel"
        subtitle={
          loading
            ? undefined
            : `${formatCurrency(tripExpenseTotal)} in trip expenses · ${trips.length} ${
                trips.length === 1 ? "trip" : "trips"
              }`
        }
        actions={
          <GlassButton variant="primary" onClick={openAdd}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Trip
          </GlassButton>
        }
      />

      {/* --------------------------------------------- Expenses to file */}
      <GlassCard padded={false} className="mb-6 px-1.5 py-4 sm:px-2.5 sm:py-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 sm:px-4">
          <h2 className="text-base font-semibold tracking-tight text-text-primary">
            Trip expenses to file
          </h2>
          <span className="tnum text-sm font-semibold text-text-primary">
            {formatCurrency(unassigned.reduce((s, t) => s + t.amount, 0))}
          </span>
        </div>
        <p className="mb-2 px-3 text-xs text-text-tertiary sm:px-4">
          Expenses in the Trip category that are not on a trip yet. Drag one by its grip
          onto a trip below, or tap <span className="font-medium">Add to trip</span>.
        </p>

        {unassigned.length === 0 ? (
          <div className="px-3 pb-1 pt-2 sm:px-4">
            <EmptyState
              icon={Receipt}
              title={tripExpenses.length === 0 ? "No trip expenses yet" : "Everything is filed"}
              description={
                tripExpenses.length === 0
                  ? "Add an expense and pick the Trip category — it will show up here."
                  : "Every trip expense has been added to a trip."
              }
            />
          </div>
        ) : (
          <ul>
            {unassigned.map((t) => (
              <li
                key={t.id}
                {...drag.rowProps(t.id)}
                className={clsx(
                  "flex items-center gap-2 rounded-2xl px-2 py-2.5 transition-all duration-200 sm:gap-3 sm:px-3",
                  "hover:bg-text-primary/[0.035]",
                  drag.dragId === t.id && "opacity-40"
                )}
              >
                {/* Shown at every width: on touch this grip is the only way to
                    start a drag, because it is the one element that opts out of
                    the browser's own scrolling. The button below still works
                    everywhere for anyone who would rather not drag at all. */}
                <button
                  type="button"
                  {...drag.handleProps(t.id)}
                  aria-label={`Drag ${t.description} onto a trip`}
                  className="-ml-0.5 flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-text-primary/[0.06] hover:text-text-secondary active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" aria-hidden />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {t.description}
                  </p>
                  <p className="tnum mt-0.5 text-xs text-text-tertiary">
                    {formatFullDate(t.expense_date)} · {t.account}
                  </p>
                </div>
                <span className="tnum shrink-0 text-sm font-semibold text-text-primary">
                  {formatCurrency(t.amount)}
                </span>
                <GlassButton
                  variant="glass"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setAssigning({ transaction: t })}
                  disabled={trips.length === 0}
                  title={trips.length === 0 ? "Add a trip first" : undefined}
                >
                  Add to trip
                </GlassButton>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      {/* ------------------------------------------------------- The trips */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold tracking-tight text-text-primary">
          Your trips
        </h2>
        <span className="text-xs text-text-tertiary">
          Tap a trip to see everything spent on it
        </span>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:flex-1">
          <GlassInput
            icon={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by place or notes"
            aria-label="Search trips"
          />
        </div>
        <GlassDropdown
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          options={SORT_OPTIONS}
          placeholder="Newest first"
          allValue="date-desc"
          icon={<ArrowUpDown />}
          align="right"
          className="sm:w-[184px]"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Luggage}
          title={query ? "No trips match that search" : "No trips yet"}
          description={
            query
              ? "Try a different place or clear the search."
              : "Create a trip, then file your trip expenses against it."
          }
          action={
            !query && (
              <GlassButton variant="primary" onClick={openAdd}>
                <Plus className="h-4 w-4" aria-hidden />
                Add Trip
              </GlassButton>
            )
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((trip) => {
            const entries = entriesByTrip.get(trip.id) ?? [];
            const spent = entries.reduce((sum, e) => sum + e.transaction.amount, 0);
            const isTarget = drag.overId === trip.id;

            return (
              <GlassCard
                as="li"
                key={trip.id}
                interactive
                data-drop-id={trip.id}
                onClick={() => setDetailTripId(trip.id)}
                className={clsx(
                  "group flex cursor-pointer flex-col",
                  isTarget && "ring-2 ring-primary/60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 truncate text-lg font-semibold tracking-tight text-text-primary">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {trip.place}
                    </h3>
                    <p className="tnum mt-1 text-xs text-text-tertiary">
                      {formatFullDate(trip.trip_date)}
                    </p>
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(trip)}
                      aria-label={`Edit ${trip.place}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-text-primary/[0.06] hover:text-text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(trip)}
                      aria-label={`Delete ${trip.place}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                <p className="tnum mt-4 text-2xl font-semibold tracking-tight text-text-primary">
                  {formatCurrency(spent)}
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  {entries.length} {entries.length === 1 ? "expense" : "expenses"} filed
                  {trip.total_amount > 0 && <> · {formatCurrency(trip.total_amount)} recorded</>}
                </p>

                {trip.notes && (
                  <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                    {trip.notes}
                  </p>
                )}

                {isTarget && (
                  <p className="mt-3 text-xs font-medium text-primary">
                    Drop to add to {trip.place}
                  </p>
                )}
              </GlassCard>
            );
          })}
        </ul>
      )}

      {/* ------------------------------------------------------ Drag ghost */}
      {/* The browser draws no drag image for a pointer-driven drag, so this
          stands in for one. `pointer-events-none` keeps it out of the way of
          the hit-test that decides which trip is under the finger. */}
      {dragged && drag.point && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-glass bg-surface/95 px-3.5 py-2 shadow-card-hover backdrop-blur"
          style={{ left: drag.point.x, top: drag.point.y }}
        >
          <p className="max-w-[220px] truncate text-sm font-medium text-text-primary">
            {dragged.description}
          </p>
          <p className="tnum mt-0.5 text-xs text-text-tertiary">
            {formatCurrency(dragged.amount)}
          </p>
        </div>
      )}

      {/* --------------------------------------------------------- Modals */}
      <AssignExpenseModal
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        transaction={assigning?.transaction ?? null}
        trips={trips}
        defaultTripId={assigning?.tripId}
        currentCategory={assigning?.category}
        onSaved={async (message) => {
          await loadLinks();
          toast({ title: message });
        }}
      />

      <TripDetailModal
        open={detailTrip !== null}
        onClose={() => setDetailTripId(null)}
        trip={detailTrip}
        entries={detailTrip ? (entriesByTrip.get(detailTrip.id) ?? []) : []}
        onEditCategory={(transaction, link) =>
          setAssigning({ transaction, tripId: link.trip_id, category: link.trip_category })
        }
        onRemove={(transaction) => void removeFromTrip(transaction)}
      />

      <GlassModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Trip" : "Add Trip"}
        subtitle="Name the trip, then file expenses against it."
        footer={
          <div className="flex gap-3">
            <GlassButton variant="glass" block onClick={() => setFormOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              form="trip-form"
              variant="primary"
              block
              disabled={saving}
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Trip"}
            </GlassButton>
          </div>
        }
      >
        <form id="trip-form" onSubmit={handleSubmit} className="space-y-4 pb-1">
          <Field label="Place" htmlFor="trip-place">
            <GlassInput
              id="trip-place"
              icon={<MapPin />}
              value={form.place}
              onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
              placeholder="Goa"
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Trip Date" htmlFor="trip-date">
              <GlassInput
                id="trip-date"
                type="date"
                icon={<CalendarDays />}
                value={form.trip_date}
                onChange={(e) => setForm((f) => ({ ...f, trip_date: e.target.value }))}
              />
            </Field>

            <Field
              label="Recorded total"
              hint="Optional — filed expenses are counted separately."
              htmlFor="trip-amount"
            >
              <GlassInput
                id="trip-amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className="tnum"
                icon={<span className="text-sm font-semibold">₹</span>}
                value={form.total_amount}
                onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="Notes" hint="Optional" htmlFor="trip-notes">
            <GlassTextarea
              id="trip-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Weekend trip with friends"
            />
          </Field>

          {error && (
            <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      </GlassModal>

      <ConfirmDialog
        open={deleting !== null}
        destructive
        busy={deleteBusy}
        title="Delete this trip?"
        description={
          deleting
            ? `"${deleting.place}" will be removed. The expenses filed against it are not deleted — they go back to the list above.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
