import { SupabaseClient } from "@supabase/supabase-js";
import { currentCycleWindow, nextCycleWindow } from "./billing-cycle";
import { BillingCycle, Card, CycleSummary, CycleWithExpenses, Expense } from "./types";

/**
 * The open month for one card, creating it if there is none.
 *
 * Chaining rule:
 *   - No month yet: create one around TODAY, using this card's bill day.
 *   - Most recent still open: that is the current month.
 *   - Most recent closed: the next month follows it chronologically, not
 *     recomputed from today — so months chain back-to-back with no gaps or
 *     overlaps, however long the card sits unopened.
 *
 * Scoped to a card, so each card runs its own chain: closing one card's
 * month leaves every other card untouched.
 */
export async function getOrCreateCurrentCycle(
  supabase: SupabaseClient,
  userId: string,
  card: Card
): Promise<BillingCycle> {
  const { data: latest, error } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("user_id", userId)
    .eq("card_id", card.id)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!latest) {
    const window = currentCycleWindow(card.bill_day);
    return insertCycle(supabase, userId, card.id, window.start_date, window.end_date);
  }

  if (latest.status === "open") {
    return latest as BillingCycle;
  }

  // An archived card is a closed book: opening it to look at its history
  // must not quietly start a new month on it.
  if (card.archived_at) return latest as BillingCycle;

  const window = nextCycleWindow(latest.end_date, card.bill_day);
  return insertCycle(supabase, userId, card.id, window.start_date, window.end_date);
}

async function insertCycle(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
  start_date: string,
  end_date: string
): Promise<BillingCycle> {
  const { data, error } = await supabase
    .from("billing_cycles")
    .insert({ start_date, end_date, status: "open", user_id: userId, card_id: cardId })
    .select("*")
    .single();

  if (error) {
    // Two requests can race to bootstrap/chain the same cycle at once (e.g.
    // opening the app on two devices at the same moment, or React Strict
    // Mode double-firing an effect in development). Postgres rejects the
    // second insert with a unique-constraint violation on (card, start_date)
    // — in that case the cycle already exists, so just fetch and return it.
    if ((error as { code?: string }).code === "23505") {
      const { data: existing, error: fetchError } = await supabase
        .from("billing_cycles")
        .select("*")
        .eq("user_id", userId)
        .eq("card_id", cardId)
        .eq("start_date", start_date)
        .single();
      if (fetchError) throw fetchError;
      return existing as BillingCycle;
    }
    throw error;
  }
  return data as BillingCycle;
}

export async function closeCycle(
  supabase: SupabaseClient,
  userId: string,
  cycleId: string
): Promise<BillingCycle> {
  const { data, error } = await supabase
    .from("billing_cycles")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", cycleId)
    .eq("user_id", userId)
    .eq("status", "open")
    .select("*")
    .single();

  if (error) throw error;
  return data as BillingCycle;
}

export async function getCycleById(
  supabase: SupabaseClient,
  userId: string,
  cycleId: string
): Promise<BillingCycle | null> {
  const { data, error } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("id", cycleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as BillingCycle) ?? null;
}

export async function getExpensesForCycle(
  supabase: SupabaseClient,
  cycleId: string
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Expense[]) ?? [];
}

export function computeSummary(expenses: Expense[]): CycleSummary {
  let totalSpending = 0;
  let mySpending = 0;
  let amountToGet = 0;
  let amountYetToGet = 0;
  const categoryTotals = new Map<string, number>();

  for (const e of expenses) {
    const total = Number(e.total_amount);
    const others = Number(e.others_amount);
    const mine = Math.max(0, total - others);

    totalSpending += total;
    mySpending += mine;
    amountToGet += others;
    if (others > 0 && e.settlement_status === "not_settled") {
      amountYetToGet += others;
    }

    categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + mine);
  }

  const categoryBreakdown = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalSpending: round2(totalSpending),
    mySpending: round2(mySpending),
    amountToGet: round2(amountToGet),
    amountYetToGet: round2(amountYetToGet),
    categoryBreakdown,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getCycleWithExpenses(
  supabase: SupabaseClient,
  userId: string,
  cycleId: string,
  card: Card
): Promise<CycleWithExpenses | null> {
  const cycle = await getCycleById(supabase, userId, cycleId);
  if (!cycle) return null;
  const expenses = await getExpensesForCycle(supabase, cycleId);
  return { card, cycle, expenses, summary: computeSummary(expenses) };
}
