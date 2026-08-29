"use client";

import { useCallback, useEffect, useState } from "react";
import { CycleWithExpenses, Expense, ExpenseInput, SettlementStatus } from "@/lib/types";
import { formatCycleLabel } from "@/lib/billing-cycle";
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

export default function DashboardPage() {
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
    } else {
      await createExpense(data.cycle.id, input);
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
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close billing cycle.");
    } finally {
      setCloseBusy(false);
    }
  }

  if (loading && !data) {
    return <div className="py-20 text-center text-slate-400">Loading your billing cycle…</div>;
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
        <div className="mt-3">
          <button
            onClick={load}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Current Billing Cycle
          </p>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            {formatCycleLabel(data.cycle)}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            + Add Expense
          </button>
          <button
            onClick={() => setCloseOpen(true)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close Current Month
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <SummaryCards summary={data.summary} />

      <CategoryChart data={data.summary.categoryBreakdown} />

      <div>
        <p className="mb-2 text-sm font-medium text-slate-500">Expenses this cycle</p>
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
