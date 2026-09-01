"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Gift,
  IndianRupee,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import GlassInput, { Field, GlassTextarea } from "@/components/glass/GlassInput";
import GlassModal from "@/components/glass/GlassModal";
import MonthPicker from "@/components/glass/MonthPicker";
import ProgressBar from "@/components/glass/ProgressBar";
import { DashboardSkeleton } from "@/components/Skeleton";
import PageHeader from "@/components/tracker/PageHeader";
import { useToast } from "@/components/ToastProvider";
import { formatCurrency } from "@/lib/format";
import {
  currentMonthKey,
  dateToMonthKey,
  formatFullDate,
  formatMonthKey,
  monthKeyToDate,
  todayIso,
  yearOf,
} from "@/lib/month";
import {
  createAllocation,
  createBonus,
  deleteAllocation,
  deleteBonus,
  fetchSalary,
  saveSalaryMonth,
  updateAllocation,
  updateBonus,
  type SalaryData,
} from "@/lib/tracker-client";
import { Bonus, SalaryAllocation } from "@/lib/types";

/**
 * Salary, and what was done with it.
 *
 * Bonuses live at the bottom, visually quieter, and are never folded into a
 * month's salary — a once-a-year payment added to September would make that
 * month read as a permanent raise, which is exactly the wrong picture.
 *
 * This page fetches its own data rather than going through the app bootstrap:
 * it is the only page that needs it, and three extra queries on every
 * navigation is a poor trade for one screen.
 */
export default function SalaryPage() {
  const { toast } = useToast();

  const [data, setData] = useState<SalaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(currentMonthKey);

  const load = useCallback(async () => {
    try {
      setData(await fetchSalary());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your salary.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ------------------------------------------------------------ derived */

  const monthDate = monthKeyToDate(month);

  const salary = useMemo(
    () => data?.months.find((m) => dateToMonthKey(m.month) === month) ?? null,
    [data, month]
  );

  const allocations = useMemo(
    () => (data?.allocations ?? []).filter((a) => dateToMonthKey(a.month) === month),
    [data, month]
  );

  const allocated = useMemo(
    () => allocations.reduce((sum, a) => sum + a.amount, 0),
    [allocations]
  );

  const salaryAmount = salary?.amount ?? 0;
  const unallocated = salaryAmount - allocated;
  const allocatedPct = salaryAmount > 0 ? (allocated / salaryAmount) * 100 : 0;

  // Bonuses are shown for the year the selected month falls in, so stepping
  // through months does not make a bonus appear and disappear.
  const year = Number(month.slice(0, 4));
  const bonusesThisYear = useMemo(
    () => (data?.bonuses ?? []).filter((b) => yearOf(b.received_on) === year),
    [data, year]
  );
  const bonusTotal = bonusesThisYear.reduce((sum, b) => sum + b.amount, 0);

  /* -------------------------------------------------------------- salary */

  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState("");
  const [salaryNotes, setSalaryNotes] = useState("");
  const [savingSalary, setSavingSalary] = useState(false);

  function openSalary() {
    setSalaryDraft(salaryAmount > 0 ? String(salaryAmount) : "");
    setSalaryNotes(salary?.notes ?? "");
    setSalaryOpen(true);
  }

  async function handleSaveSalary() {
    const amount = salaryDraft.trim() === "" ? 0 : Number(salaryDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: "Enter a valid amount", variant: "error" });
      return;
    }
    setSavingSalary(true);
    try {
      await saveSalaryMonth({
        month: monthDate,
        amount,
        notes: salaryNotes.trim() || null,
      });
      await load();
      toast({
        title: amount > 0 ? "Salary saved" : "Salary cleared",
        description: formatMonthKey(month),
      });
      setSalaryOpen(false);
    } catch (err) {
      toast({
        title: "Could not save the salary",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setSavingSalary(false);
    }
  }

  /* --------------------------------------------------------- allocations */

  const [allocOpen, setAllocOpen] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<SalaryAllocation | null>(null);
  const [allocLabel, setAllocLabel] = useState("");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocError, setAllocError] = useState<string | null>(null);
  const [savingAlloc, setSavingAlloc] = useState(false);
  const [deletingAlloc, setDeletingAlloc] = useState<SalaryAllocation | null>(null);

  function openAlloc(existing: SalaryAllocation | null) {
    setEditingAlloc(existing);
    setAllocLabel(existing?.label ?? "");
    setAllocAmount(existing ? String(existing.amount) : "");
    setAllocError(null);
    setAllocOpen(true);
  }

  async function handleSaveAlloc(e: React.FormEvent) {
    e.preventDefault();
    setAllocError(null);

    if (!allocLabel.trim()) return setAllocError("Give this a name, e.g. Rent or Savings.");
    const amount = Number(allocAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return setAllocError("Enter an amount greater than zero.");
    }

    setSavingAlloc(true);
    try {
      const input = { month: monthDate, label: allocLabel.trim(), amount };
      if (editingAlloc) await updateAllocation(editingAlloc.id, input);
      else await createAllocation(input);
      await load();
      toast({ title: editingAlloc ? "Split updated" : "Split added" });
      setAllocOpen(false);
    } catch (err) {
      setAllocError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingAlloc(false);
    }
  }

  async function handleDeleteAlloc() {
    if (!deletingAlloc) return;
    try {
      await deleteAllocation(deletingAlloc.id);
      await load();
      toast({ title: "Split removed", description: deletingAlloc.label });
    } catch (err) {
      toast({
        title: "Could not remove it",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeletingAlloc(null);
    }
  }

  /* -------------------------------------------------------------- bonus */

  const [bonusOpen, setBonusOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);
  const [bonusLabel, setBonusLabel] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusDate, setBonusDate] = useState(todayIso);
  const [bonusNotes, setBonusNotes] = useState("");
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [savingBonus, setSavingBonus] = useState(false);
  const [deletingBonus, setDeletingBonus] = useState<Bonus | null>(null);

  function openBonus(existing: Bonus | null) {
    setEditingBonus(existing);
    setBonusLabel(existing?.label ?? "");
    setBonusAmount(existing ? String(existing.amount) : "");
    setBonusDate(existing?.received_on ?? todayIso());
    setBonusNotes(existing?.notes ?? "");
    setBonusError(null);
    setBonusOpen(true);
  }

  async function handleSaveBonus(e: React.FormEvent) {
    e.preventDefault();
    setBonusError(null);

    if (!bonusLabel.trim()) return setBonusError("Give this bonus a name.");
    const amount = Number(bonusAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return setBonusError("Enter an amount greater than zero.");
    }
    if (!bonusDate) return setBonusError("Choose the date it arrived.");

    setSavingBonus(true);
    try {
      const input = {
        received_on: bonusDate,
        label: bonusLabel.trim(),
        amount,
        notes: bonusNotes.trim() || null,
      };
      if (editingBonus) await updateBonus(editingBonus.id, input);
      else await createBonus(input);
      await load();
      toast({ title: editingBonus ? "Bonus updated" : "Bonus added" });
      setBonusOpen(false);
    } catch (err) {
      setBonusError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingBonus(false);
    }
  }

  async function handleDeleteBonus() {
    if (!deletingBonus) return;
    try {
      await deleteBonus(deletingBonus.id);
      await load();
      toast({ title: "Bonus removed", description: deletingBonus.label });
    } catch (err) {
      toast({
        title: "Could not remove it",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeletingBonus(null);
    }
  }

  /* -------------------------------------------------------------- render */

  if (!data && !error) return <DashboardSkeleton />;

  if (error) {
    return (
      <GlassCard className="text-center">
        <p className="text-sm font-medium text-danger">{error}</p>
        <p className="mt-1 text-sm text-text-secondary">
          If this mentions a missing table, run the salary migration in Supabase.
        </p>
      </GlassCard>
    );
  }

  const rowActions = "flex shrink-0 items-center opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100";
  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors";

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Salary"
        eyebrow={formatMonthKey(month)}
        subtitle="What came in, and where it went."
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />

      {/* ------------------------------------------------------ The month */}
      <GlassCard weight="strong" glow className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
          Salary · {formatMonthKey(month)}
        </p>
        <p className="tnum mt-2 text-[36px] font-semibold leading-none tracking-tight text-text-primary sm:text-[46px]">
          {salaryAmount > 0 ? formatCurrency(salaryAmount) : "Not set"}
        </p>

        {salary?.notes && (
          <p className="mt-2 text-sm text-text-secondary">{salary.notes}</p>
        )}

        {salaryAmount > 0 && (
          <>
            <ProgressBar
              value={allocatedPct}
              tone={unallocated < 0 ? "danger" : "primary"}
              className="mt-5"
              label="Share of salary accounted for"
            />
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="tnum text-sm text-text-secondary">
                {formatCurrency(allocated)} accounted for
              </span>
              <span
                className={clsx(
                  "tnum text-sm font-semibold",
                  unallocated < 0 ? "text-danger" : "text-text-primary"
                )}
              >
                {unallocated < 0
                  ? `${formatCurrency(Math.abs(unallocated))} over`
                  : `${formatCurrency(unallocated)} left to assign`}
              </span>
            </div>
          </>
        )}

        <GlassButton variant="primary" size="sm" className="mt-5" onClick={openSalary}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          {salaryAmount > 0 ? "Edit salary" : "Add salary"}
        </GlassButton>
      </GlassCard>

      {/* ----------------------------------------------------- The split up */}
      <GlassCard padded={false} className="mb-5 p-4 sm:p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-1">
          <h2 className="text-base font-semibold tracking-tight text-text-primary">
            Where it went
          </h2>
          <GlassButton variant="glass" size="sm" onClick={() => openAlloc(null)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add split
          </GlassButton>
        </div>
        <p className="mb-3 px-1 text-xs text-text-tertiary">
          Rent, savings, investments — however you divided {formatMonthKey(month)}.
        </p>

        {allocations.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nothing split yet"
            description="Break the month's salary into where it actually went."
            action={
              <GlassButton variant="primary" onClick={() => openAlloc(null)}>
                <Plus className="h-4 w-4" aria-hidden />
                Add split
              </GlassButton>
            }
          />
        ) : (
          <ul className="divide-y divide-[color:var(--glass-border-soft)]">
            {allocations.map((a) => {
              const share = salaryAmount > 0 ? (a.amount / salaryAmount) * 100 : 0;
              return (
                <li key={a.id} className="group px-1 py-3 sm:px-2">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                      {a.label}
                    </span>
                    <span className="tnum shrink-0 text-sm font-semibold text-text-primary">
                      {formatCurrency(a.amount)}
                    </span>
                    {salaryAmount > 0 && (
                      <span className="tnum w-10 shrink-0 text-right text-xs text-text-tertiary">
                        {share.toFixed(0)}%
                      </span>
                    )}
                    <div className={rowActions}>
                      <button
                        type="button"
                        onClick={() => openAlloc(a)}
                        aria-label={`Edit ${a.label}`}
                        className={clsx(iconButton, "hover:bg-text-primary/[0.06] hover:text-text-primary")}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingAlloc(a)}
                        aria-label={`Remove ${a.label}`}
                        className={clsx(iconButton, "hover:bg-danger/10 hover:text-danger")}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                  {salaryAmount > 0 && (
                    <ProgressBar value={share} size="sm" className="mt-2" tone="primary" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>

      {/* ---------------------------------------------------------- Bonuses */}
      {/* Deliberately the quietest card on the page: a bonus is an exception,
          not part of the monthly rhythm. */}
      <GlassCard weight="subtle" padded={false} className="p-4 sm:p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-text-primary">
            <Gift className="h-4 w-4 text-text-tertiary" aria-hidden />
            Bonuses in {year}
          </h2>
          <GlassButton variant="ghost" size="sm" onClick={() => openBonus(null)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add bonus
          </GlassButton>
        </div>
        <p className="mb-2 px-1 text-xs text-text-tertiary">
          Kept out of the monthly figures above, so one payment does not read as a raise.
        </p>

        {bonusesThisYear.length === 0 ? (
          <p className="px-1 py-4 text-sm text-text-tertiary">No bonuses recorded for {year}.</p>
        ) : (
          <>
            <ul className="divide-y divide-[color:var(--glass-border-soft)]">
              {bonusesThisYear.map((b) => (
                <li key={b.id} className="group flex items-center gap-3 px-1 py-2.5 sm:px-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{b.label}</p>
                    <p className="tnum mt-0.5 text-xs text-text-tertiary">
                      {formatFullDate(b.received_on)}
                      {b.notes ? ` · ${b.notes}` : ""}
                    </p>
                  </div>
                  <span className="tnum shrink-0 text-sm font-semibold text-text-primary">
                    {formatCurrency(b.amount)}
                  </span>
                  <div className={rowActions}>
                    <button
                      type="button"
                      onClick={() => openBonus(b)}
                      aria-label={`Edit ${b.label}`}
                      className={clsx(iconButton, "hover:bg-text-primary/[0.06] hover:text-text-primary")}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingBonus(b)}
                      aria-label={`Remove ${b.label}`}
                      className={clsx(iconButton, "hover:bg-danger/10 hover:text-danger")}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="tnum mt-3 px-1 text-xs text-text-secondary">
              {formatCurrency(bonusTotal)} in {year}
            </p>
          </>
        )}
      </GlassCard>

      {/* ---------------------------------------------------------- Modals */}
      <GlassModal
        open={salaryOpen}
        onClose={() => setSalaryOpen(false)}
        title="Salary"
        subtitle={formatMonthKey(month)}
        size="sm"
        footer={
          <div className="flex gap-3">
            <GlassButton variant="glass" block onClick={() => setSalaryOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              block
              disabled={savingSalary}
              onClick={() => void handleSaveSalary()}
            >
              {savingSalary ? "Saving…" : "Save"}
            </GlassButton>
          </div>
        }
      >
        <Field
          label="Amount received"
          hint="Leave empty to clear this month."
          htmlFor="salary-amount"
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-tertiary">
              ₹
            </span>
            <input
              id="salary-amount"
              type="number"
              min={0}
              step="1"
              inputMode="decimal"
              value={salaryDraft}
              onChange={(e) => setSalaryDraft(e.target.value)}
              placeholder="0"
              className="tnum h-16 w-full rounded-2xl border border-glass bg-white/45 pl-10 pr-4 text-3xl font-semibold tracking-tight text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary/50 focus:border-primary/60 focus:bg-white/70 focus:ring-4 focus:ring-primary/10 dark:bg-white/[0.05] dark:focus:bg-white/[0.09]"
            />
          </div>
        </Field>

        <Field label="Note" hint="Optional" htmlFor="salary-notes" className="mt-4">
          <GlassInput
            id="salary-notes"
            value={salaryNotes}
            onChange={(e) => setSalaryNotes(e.target.value)}
            placeholder="e.g. includes arrears"
            autoComplete="off"
          />
        </Field>
      </GlassModal>

      <GlassModal
        open={allocOpen}
        onClose={() => setAllocOpen(false)}
        title={editingAlloc ? "Edit split" : "Add split"}
        subtitle={formatMonthKey(month)}
        size="sm"
        footer={
          <div className="flex gap-3">
            <GlassButton variant="glass" block onClick={() => setAllocOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              form="alloc-form"
              variant="primary"
              block
              disabled={savingAlloc}
            >
              {savingAlloc ? "Saving…" : editingAlloc ? "Save" : "Add"}
            </GlassButton>
          </div>
        }
      >
        <form id="alloc-form" onSubmit={handleSaveAlloc} className="space-y-4 pb-1">
          <Field label="What for" htmlFor="alloc-label">
            <GlassInput
              id="alloc-label"
              value={allocLabel}
              onChange={(e) => setAllocLabel(e.target.value)}
              placeholder="Rent, Savings, SIP, Sent home…"
              autoComplete="off"
            />
          </Field>

          <Field label="Amount" htmlFor="alloc-amount">
            <GlassInput
              id="alloc-amount"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className="tnum"
              icon={<span className="text-sm font-semibold">₹</span>}
              value={allocAmount}
              onChange={(e) => setAllocAmount(e.target.value)}
              placeholder="0"
            />
          </Field>

          {allocError && (
            <p className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {allocError}
            </p>
          )}
        </form>
      </GlassModal>

      <GlassModal
        open={bonusOpen}
        onClose={() => setBonusOpen(false)}
        title={editingBonus ? "Edit bonus" : "Add bonus"}
        subtitle="Recorded on its own, apart from monthly salary."
        footer={
          <div className="flex gap-3">
            <GlassButton variant="glass" block onClick={() => setBonusOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              form="bonus-form"
              variant="primary"
              block
              disabled={savingBonus}
            >
              {savingBonus ? "Saving…" : editingBonus ? "Save" : "Add"}
            </GlassButton>
          </div>
        }
      >
        <form id="bonus-form" onSubmit={handleSaveBonus} className="space-y-4 pb-1">
          <Field label="What is it" htmlFor="bonus-label">
            <GlassInput
              id="bonus-label"
              icon={<Gift />}
              value={bonusLabel}
              onChange={(e) => setBonusLabel(e.target.value)}
              placeholder="Annual bonus"
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Amount" htmlFor="bonus-amount">
              <GlassInput
                id="bonus-amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className="tnum"
                icon={<IndianRupee />}
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Received on" htmlFor="bonus-date">
              <GlassInput
                id="bonus-date"
                type="date"
                icon={<CalendarDays />}
                value={bonusDate}
                onChange={(e) => setBonusDate(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Note" hint="Optional" htmlFor="bonus-notes">
            <GlassTextarea
              id="bonus-notes"
              value={bonusNotes}
              onChange={(e) => setBonusNotes(e.target.value)}
              placeholder="What it was for, where it went…"
            />
          </Field>

          {bonusError && (
            <p className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {bonusError}
            </p>
          )}
        </form>
      </GlassModal>

      <ConfirmDialog
        open={deletingAlloc !== null}
        destructive
        title="Remove this split?"
        description={deletingAlloc ? `"${deletingAlloc.label}" will be removed.` : ""}
        confirmLabel="Remove"
        onConfirm={handleDeleteAlloc}
        onCancel={() => setDeletingAlloc(null)}
      />

      <ConfirmDialog
        open={deletingBonus !== null}
        destructive
        title="Remove this bonus?"
        description={deletingBonus ? `"${deletingBonus.label}" will be removed.` : ""}
        confirmLabel="Remove"
        onConfirm={handleDeleteBonus}
        onCancel={() => setDeletingBonus(null)}
      />
    </div>
  );
}
