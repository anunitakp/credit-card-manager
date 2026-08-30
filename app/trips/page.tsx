"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, CalendarDays, Luggage, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/format";
import { formatFullDate, todayIso } from "@/lib/month";
import { createTrip, deleteTrip, updateTrip } from "@/lib/tracker-client";
import { Trip } from "@/lib/types";

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Most expensive" },
  { value: "amount-asc", label: "Least expensive" },
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
  const { trips, loading, refreshTrips } = useTracker();

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
      ? trips.filter((t) =>
          `${t.place} ${t.notes ?? ""}`.toLowerCase().includes(needle)
        )
      : trips;

    const sorted = [...filtered];
    switch (sort) {
      case "date-asc":
        return sorted.sort((a, b) => a.trip_date.localeCompare(b.trip_date));
      case "amount-desc":
        return sorted.sort((a, b) => b.total_amount - a.total_amount);
      case "amount-asc":
        return sorted.sort((a, b) => a.total_amount - b.total_amount);
      default:
        return sorted.sort((a, b) => b.trip_date.localeCompare(a.trip_date));
    }
  }, [trips, query, sort]);

  const grandTotal = useMemo(
    () => trips.reduce((sum, t) => sum + t.total_amount, 0),
    [trips]
  );

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
      return setError("Total expense must be a number of 0 or more.");
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
        toast({ title: "Trip saved", description: payload.place });
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

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Trips"
        eyebrow="Travel log"
        subtitle={
          loading
            ? undefined
            : `${trips.length} ${trips.length === 1 ? "trip" : "trips"} · ${formatCurrency(grandTotal)} in total`
        }
        actions={
          <GlassButton variant="primary" onClick={openAdd}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Trip
          </GlassButton>
        }
      />

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
          title={query ? "No trips match that search" : "No trips recorded yet"}
          description={
            query
              ? "Try a different place or clear the search."
              : "Keep a simple record of where you went and what it cost."
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
          {visible.map((trip) => (
            <GlassCard as="li" key={trip.id} interactive className="group flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1.5 truncate text-lg font-semibold tracking-tight text-text-primary">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {trip.place}
                  </h2>
                  <p className="tnum mt-1 text-xs text-text-tertiary">
                    {formatFullDate(trip.trip_date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
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
                {formatCurrency(trip.total_amount)}
              </p>

              {trip.notes && (
                <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {trip.notes}
                </p>
              )}
            </GlassCard>
          ))}
        </ul>
      )}

      {/* --------------------------------------------------------- Trip form */}
      <GlassModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Trip" : "Add Trip"}
        subtitle="A standalone record — trips are not counted in your monthly spending."
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

            <Field label="Total Expense" htmlFor="trip-amount">
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
                placeholder="18500"
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
            <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>
          )}
        </form>
      </GlassModal>

      <ConfirmDialog
        open={deleting !== null}
        destructive
        busy={deleteBusy}
        title="Delete this trip?"
        description={
          deleting ? `"${deleting.place}" will be removed. This cannot be undone.` : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
