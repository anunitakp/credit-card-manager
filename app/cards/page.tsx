"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Calendar, Lock, Plus } from "lucide-react";
import { CycleWithExpenses, Expense, ExpenseInput, SettlementStatus } from "@/lib/types";
import { formatCycleLabelShort, formatDateLabel, isCycleClosable } from "@/lib/billing-cycle";
import { formatCurrency } from "@/lib/format";
import {
  closeCurrentCycle,
  createExpense,
  deleteExpense,
  fetchCurrentCycle,
  updateExpense,
  updateSettlement,
} from "@/lib/api-client";
import SummaryCards from "@/components/SummaryCards";
import CategoryChart from "@/components/CategoryChart";
import ExpenseTable from "@/components/ExpenseTable";
import ExpenseForm from "@/components/ExpenseForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/ToastProvider";

export default function DashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<CycleWithExpenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCurrentCycle();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your billing cycle.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddOrEdit(input: ExpenseInput) {
    if (!data) return;
    if (editing) {
      await updateExpense(editing.id, input);
      toast({
        title: "Expense updated",
        description: `${input.expense_name} · ${formatCurrency(input.total_amount)}`,
      });
    } else {
      await createExpense(data.cycle.id, input);
      toast({
        title: "Expense added",
        description: `${formatCurrency(input.total_amount)} ${input.expense_name} added to this billing cycle.`,
      });
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  }

  async function handleSettlementChange(expense: Expense, status: SettlementStatus) {
    // optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const expenses = prev.expenses.map((e) =>
        e.id === expense.id ? { ...e, settlement_status: status } : e
      );
      return { ...prev, expenses };
    });
    try {
      await updateSettlement(expense.id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settlement status.");
      await load();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteExpense(deleting.id);
      toast({ title: "Expense deleted", description: deleting.expense_name });
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense.");
      toast({ title: "Couldn't delete expense", variant: "error" });
    } finally {
      setDeleteBusy(false);
    }
  }

  async function confirmClose() {
    setCloseBusy(true);
    try {
      const result = await closeCurrentCycle();
      setData(result);
      setCloseOpen(false);
      toast({ title: "Billing cycle closed", description: "Moved to Archives." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close billing cycle.");
      toast({ title: "Couldn't close billing cycle", variant: "error" });
    } finally {
      setCloseBusy(false);
    }
  }

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="glass glass-lit rounded-2xl border-danger/25 p-6 text-center text-danger">
        {error}
        <div className="mt-3">
          <button
            onClick={load}
            className="rounded-xl border border-danger/30 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-danger/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const closable = isCycleClosable(data.cycle.end_date);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            Current Billing Cycle
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">
            {formatCycleLabelShort(data.cycle)}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/cards/archives"
            className="glass-strong glass-lit inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-medium text-text-primary transition-all duration-200 hover:shadow-card-hover active:scale-[0.97]"
          >
            <Archive className="h-4 w-4" aria-hidden />
            Archives
          </Link>
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-card transition-all duration-200 active:scale-[0.97] hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add Expense
          </button>
          <button
            onClick={() => closable && setCloseOpen(true)}
            disabled={!closable}
            title={
              closable
                ? undefined
                : `You can close this cycle starting ${formatDateLabel(
                    addOneDayIso(data.cycle.end_date)
                  )}`
            }
            className="glass-strong glass-lit inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-medium text-text-primary transition-all duration-200 active:scale-[0.97] hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!closable && <Lock className="h-3.5 w-3.5" aria-hidden />}
            Close Month
          </button>
        </div>
      </div>

      {!closable && (
        <p className="-mt-3 text-xs text-text-tertiary">
          This cycle runs through {formatDateLabel(data.cycle.end_date)}. You'll be able to close
          it the day after.
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <SummaryCards summary={data.summary} />

      <CategoryChart data={data.summary.categoryBreakdown} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Recent Expenses</h2>
        </div>
        <ExpenseTable
          expenses={data.expenses}
          onEdit={(expense) => {
            setEditing(expense);
            setFormOpen(true);
          }}
          onDelete={(expense) => setDeleting(expense)}
          onSettlementChange={handleSettlementChange}
        />
      </div>

      <ExpenseForm
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleAddOrEdit}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete this expense?"
        description={`This will permanently remove "${deleting?.expense_name ?? ""}" from this billing cycle.`}
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={closeOpen}
        title="Close this billing cycle?"
        description="Are you sure you want to close this billing cycle? Once closed, this tracker will become an archive (read-only) and a new billing cycle will be created automatically."
        confirmLabel="Close Month"
        busy={closeBusy}
        onConfirm={confirmClose}
        onCancel={() => setCloseOpen(false)}
      />
    </div>
  );
}

/** Adds one calendar day to a YYYY-MM-DD string, for the "closable from" hint. */
function addOneDayIso(isoDate: string): string {
  const [year, month1, day] = isoDate.split("-").map(Number);
  const d = new Date(year, month1 - 1, day + 1);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
