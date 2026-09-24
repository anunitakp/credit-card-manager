"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, CreditCard, Lock, Pencil, Plus } from "lucide-react";
import {
  Card,
  CardInput,
  CardSummary,
  CycleWithExpenses,
  Expense,
  ExpenseInput,
  SettlementStatus,
} from "@/lib/types";
import { isCycleClosable, ordinalDay } from "@/lib/billing-cycle";
import { formatCurrency } from "@/lib/format";
import {
  closeCurrentCycle,
  createCard,
  createExpense,
  deleteCard,
  deleteExpense,
  fetchCards,
  fetchCurrentCycle,
  setCardArchived,
  updateCard,
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
import CardSwitcher from "@/components/cards/CardSwitcher";
import CardFormModal from "@/components/cards/CardFormModal";

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

  /**
   * Which card the page is showing. Held in state rather than the URL: the
   * choice is a view preference, not a destination — reloading should land
   * you back on your main card, not on whichever one you last poked at.
   */
  const [cards, setCards] = useState<CardSummary[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);
  const [archivingCard, setArchivingCard] = useState<Card | null>(null);
  const [cardBusy, setCardBusy] = useState(false);

  /**
   * Archived cards are hidden until asked for. They are still openable — to
   * look at their history, or to bring one back — but they are not choices
   * you are making today.
   */
  const [showArchived, setShowArchived] = useState(false);


  const load = useCallback(async (cardId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCurrentCycle(cardId ?? undefined);
      setData(result);
      // The server decides which card was used when none was named, so take
      // the id back from the response rather than assuming.
      setActiveCardId(result.card.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load this card.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCards = useCallback(async (includeArchived: boolean) => {
    try {
      setCards(await fetchCards(includeArchived));
    } catch {
      // The switcher degrades to hidden; the card below still loads.
    }
  }, []);

  function openCardForm(card: Card | null) {
    setEditingCard(card);
    setCardFormOpen(true);
  }

  /**
   * How much history the card being edited has, straight from the server.
   *
   * Null means "not counted yet", which the modal treats as "assume there is
   * history" — so a slow or failed load can never present a Delete button
   * for a card full of spending.
   */
  const editingCount = editingCard
    ? (cards.find((c) => c.id === editingCard.id)?.expense_count ?? null)
    : 0;

  /** Active cards only — the ones you could still be using. */
  const activeCards = cards.filter((c) => c.archived_at === null);

  useEffect(() => {
    void loadCards(showArchived);
  }, [loadCards, showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectCard(cardId: string) {
    if (cardId === activeCardId) return;
    setActiveCardId(cardId);
    await load(cardId);
  }

  async function handleCardSubmit(input: CardInput) {
    if (editingCard) {
      const updated = await updateCard(editingCard.id, input);
      await loadCards(showArchived);
      setCardFormOpen(false);
      setEditingCard(null);
      toast({ title: "Card updated", description: updated.name });
      await load(updated.id);
    } else {
      const created = await createCard(input);
      await loadCards(showArchived);
      setCardFormOpen(false);
      toast({
        title: "Card added",
        description: `${created.name} · bills on the ${ordinalDay(created.bill_day)}`,
      });
      await load(created.id);
    }
  }

  async function confirmArchiveCard() {
    if (!archivingCard) return;
    setCardBusy(true);
    try {
      await setCardArchived(archivingCard.id, true);
      toast({
        title: "Card archived",
        description: `${archivingCard.name}'s expenses still count towards your totals.`,
      });
      setArchivingCard(null);
      setCardFormOpen(false);
      setEditingCard(null);
      const remaining = await fetchCards(showArchived);
      setCards(remaining);
      await load(remaining.find((c) => c.archived_at === null)?.id);
    } catch (err) {
      toast({
        title: "Couldn't archive the card",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setCardBusy(false);
    }
  }

  async function handleRestoreCard(card: Card) {
    setCardBusy(true);
    try {
      await setCardArchived(card.id, false);
      toast({ title: "Card restored", description: card.name });
      setCardFormOpen(false);
      setEditingCard(null);
      await loadCards(showArchived);
      await load(card.id);
    } catch (err) {
      toast({
        title: "Couldn't restore the card",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setCardBusy(false);
    }
  }

  async function confirmDeleteCard() {
    if (!deletingCard) return;
    setCardBusy(true);
    try {
      await deleteCard(deletingCard.id);
      toast({ title: "Card deleted", description: deletingCard.name });
      setDeletingCard(null);
      setCardFormOpen(false);
      setEditingCard(null);
      const remaining = await fetchCards(showArchived);
      setCards(remaining);
      await load(remaining.find((c) => c.archived_at === null)?.id);
    } catch (err) {
      toast({
        title: "Couldn't delete the card",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setCardBusy(false);
    }
  }

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
    await load(activeCardId);
    // The card list carries each card's expense count, which decides whether
    // the edit modal offers Archive or Delete — refresh it so that decision
    // is never made on a stale number.
    void loadCards(showArchived);
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
      await load(activeCardId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settlement status.");
      await load(activeCardId);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteExpense(deleting.id);
      toast({ title: "Expense deleted", description: deleting.expense_name });
      setDeleting(null);
      await load(activeCardId);
      void loadCards(showArchived);
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
      const result = await closeCurrentCycle(activeCardId ?? undefined);
      setData(result);
      setCloseOpen(false);
      toast({ title: "Month closed", description: "Moved to Archives." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close the month.");
      toast({ title: "Couldn't close the month", variant: "error" });
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
            onClick={() => void load(activeCardId)}
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
      {cards.length > 0 && (
        <CardSwitcher
          cards={cards}
          activeId={activeCardId}
          onSelect={(id) => void selectCard(id)}
          onAdd={() => openCardForm(null)}
        />
      )}

      {(showArchived || cards.length > 0) && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="-mt-3 block w-fit text-xs font-medium text-text-tertiary transition-colors hover:text-text-primary"
        >
          {showArchived ? "Hide archived cards" : "Show archived cards"}
        </button>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            <CreditCard className="h-3.5 w-3.5" aria-hidden />
            This month
          </p>
          {/* The card *is* the title. There is no date range here on
              purpose: the open month runs until you decide to close it, so
              printing a window would describe a rule that does not exist. */}
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">
            <span className="min-w-0 truncate">{data.card.name}</span>
            <button
              type="button"
              onClick={() => openCardForm(data.card)}
              aria-label={`Edit ${data.card.name}`}
              title="Edit card"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
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
                : `You can close this month once the ${ordinalDay(
                    data.card.bill_day
                  )} — this card's bill date — has passed.`
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
          Close this month whenever you like, once {data.card.name}&rsquo;s bill date — the{" "}
          {ordinalDay(data.card.bill_day)} — has passed.
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
        description={`This will permanently remove "${deleting?.expense_name ?? ""}" from this card.`}
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <CardFormModal
        open={cardFormOpen}
        card={editingCard}
        expenseCount={editingCount}
        canRetire={activeCards.length > 1 || editingCard?.archived_at != null}
        onClose={() => {
          setCardFormOpen(false);
          setEditingCard(null);
        }}
        onSubmit={handleCardSubmit}
        onArchive={() => editingCard && setArchivingCard(editingCard)}
        onRestore={() => editingCard && void handleRestoreCard(editingCard)}
        onDelete={() => editingCard && setDeletingCard(editingCard)}
      />

      <ConfirmDialog
        open={!!archivingCard}
        title={`Archive ${archivingCard?.name ?? "this card"}?`}
        description="It leaves the card switcher and the add-expense picker. Every expense on it stays exactly where it is — in your totals, your statistics and your archives. You can restore it at any time."
        confirmLabel="Archive card"
        busy={cardBusy}
        onConfirm={confirmArchiveCard}
        onCancel={() => setArchivingCard(null)}
      />

      <ConfirmDialog
        open={!!deletingCard}
        title={`Delete ${deletingCard?.name ?? "this card"}?`}
        description="Nothing has been spent on this card, so there is nothing to lose. If that ever changes, the card can only be archived."
        confirmLabel="Delete card"
        destructive
        busy={cardBusy}
        onConfirm={confirmDeleteCard}
        onCancel={() => setDeletingCard(null)}
      />

      <ConfirmDialog
        open={closeOpen}
        title={`Close this month on ${data.card.name}?`}
        description="Everything recorded so far moves to Archives, read-only, and a fresh month starts on this card. Your other cards are untouched."
        confirmLabel="Close Month"
        busy={closeBusy}
        onConfirm={confirmClose}
        onCancel={() => setCloseOpen(false)}
      />
    </div>
  );
}
