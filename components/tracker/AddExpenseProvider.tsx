"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import ExpenseForm from "@/components/ExpenseForm";
import { useToast } from "@/components/ToastProvider";
import { deleteExpense, updateExpense } from "@/lib/api-client";
import { deleteUpiExpense } from "@/lib/tracker-client";
import { Expense, ExpenseInput, Transaction } from "@/lib/types";
import AddExpenseModal from "./AddExpenseModal";
import { useTracker } from "./TrackerProvider";

/**
 * Owns adding, editing and deleting a transaction from anywhere in the app.
 *
 * Editing routes by account, because the two kinds of transaction are not
 * the same shape: a UPI expense is just an amount, while a credit-card
 * expense also carries the split with other people and its settlement
 * status. Rather than flatten that away, a credit-card row opens the Credit
 * Card Manager's own form — the same form, editing the same row.
 */

interface AddExpenseContextValue {
  /** Opens the sheet. Pass a transaction to edit it, or nothing to add. */
  open: (transaction?: Transaction) => void;
  /** Opens the delete confirmation for a transaction. */
  requestDelete: (transaction: Transaction) => void;
}

const AddExpenseContext = createContext<AddExpenseContextValue | null>(null);

export function useAddExpense(): AddExpenseContextValue {
  const ctx = useContext(AddExpenseContext);
  if (!ctx) {
    throw new Error("useAddExpense must be used inside <AddExpenseProvider>.");
  }
  return ctx;
}

export function AddExpenseProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { refreshTransactions } = useTracker();

  const [addOpen, setAddOpen] = useState(false);
  const [editingUpi, setEditingUpi] = useState<Transaction | null>(null);

  const [cardExpense, setCardExpense] = useState<Expense | null>(null);
  const [cardFormOpen, setCardFormOpen] = useState(false);

  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const open = useCallback(
    async (transaction?: Transaction) => {
      if (!transaction) {
        setEditingUpi(null);
        setAddOpen(true);
        return;
      }

      if (transaction.account === "UPI") {
        setEditingUpi(transaction);
        setAddOpen(true);
        return;
      }

      // Credit card: fetch the full row so the split and settlement status
      // survive the edit.
      try {
        const res = await fetch(`/api/expenses/${transaction.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.json())?.error ?? "Could not load this expense.");
        setCardExpense((await res.json()) as Expense);
        setCardFormOpen(true);
      } catch (err) {
        toast({
          title: "Could not open this expense",
          description: err instanceof Error ? err.message : undefined,
          variant: "error",
        });
      }
    },
    [toast]
  );

  const requestDelete = useCallback((transaction: Transaction) => {
    setDeleting(transaction);
  }, []);

  async function handleCardSubmit(input: ExpenseInput) {
    if (!cardExpense) return;
    await updateExpense(cardExpense.id, input);
    await refreshTransactions();
    setCardFormOpen(false);
    setCardExpense(null);
    toast({ title: "Expense updated" });
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      if (deleting.account === "UPI") {
        await deleteUpiExpense(deleting.id);
      } else {
        await deleteExpense(deleting.id);
      }
      await refreshTransactions();
      toast({ title: "Expense deleted", description: deleting.description });
      setDeleting(null);
    } catch (err) {
      toast({
        title: "Could not delete this expense",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  const value = useMemo<AddExpenseContextValue>(
    () => ({ open: (t) => void open(t), requestDelete }),
    [open, requestDelete]
  );

  return (
    <AddExpenseContext.Provider value={value}>
      {children}

      <AddExpenseModal
        open={addOpen}
        initial={editingUpi}
        onClose={() => {
          setAddOpen(false);
          setEditingUpi(null);
        }}
        onSaved={async (message) => {
          await refreshTransactions();
          toast({ title: message });
        }}
      />

      <ExpenseForm
        open={cardFormOpen}
        initial={cardExpense}
        onClose={() => {
          setCardFormOpen(false);
          setCardExpense(null);
        }}
        onSubmit={handleCardSubmit}
      />

      <ConfirmDialog
        open={deleting !== null}
        destructive
        busy={deleteBusy}
        title="Delete this expense?"
        description={
          deleting
            ? `"${deleting.description}" will be removed from every total, chart and budget. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </AddExpenseContext.Provider>
  );
}
