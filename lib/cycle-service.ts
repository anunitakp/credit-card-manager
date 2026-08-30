import { SupabaseClient } from "@supabase/supabase-js";
import { currentCycleWindow, nextCycleWindow } from "./billing-cycle";
import { BillingCycle, CycleSummary, CycleWithExpenses, Expense } from "./types";

/**
 * Returns the single currently-open billing cycle, creating one if none
 * exists yet.
 *
 * Cycle chaining rule:
 *   - If no cycle exists at all, create one for TODAY's local date (this
 *     bootstraps the very first tracker using the billing-cycle rules).
 *   - If the most recent cycle is still open, that is the current cycle.
 *   - If the most recent cycle was closed (via "Close Current Month"), the
 *     new current cycle is the one immediately following it chronologically
 *     (not recomputed from today's date), so cycles always chain back-to-back
 *     with no gaps or overlaps in the archive history.
 */
export async function getOrCreateCurrentCycle(
  supabase: SupabaseClient,
  userId: string
): Promise<BillingCycle> {
  const { data: latest, error } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!latest) {
    const window = currentCycleWindow();
    return insertCycle(supabase, userId, window.start_date, window.end_date);
  }

  if (latest.status === "open") {
    return latest as BillingCycle;
  }

  const window = nextCycleWindow(latest.end_date);
  return insertCycle(supabase, userId, window.start_date, window.end_date);
}

async function insertCycle(
  supabase: SupabaseClient,
  userId: string,
  start_date: string,
  end_date: string
): Promise<BillingCycle> {
  const { data, error } = await supabase
    .from("billing_cycles")
    .insert({ start_date, end_date, status: "open", user_id: userId })
    .select("*")
    .single();

  if (error) {
    // Two requests can race to bootstrap/chain the same cycle at once (e.g.
    // opening the app on two devices at the same moment, or React Strict
    // Mode double-firing an effect in development). Postgres rejects the
    // second insert with a unique-constraint violation on start_date — in
    // that case the cycle already exists, so just fetch and return it.
    if ((error as { code?: string }).code === "23505") {
      const { data: existing, error: fetchError } = await supabase
        .from("billing_cycles")
        .select("*")
        .eq("user_id", userId)
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
  cycleId: string
): Promise<CycleWithExpenses | null> {
  const cycle = await getCycleById(supabase, userId, cycleId);
  if (!cycle) return null;
  const expenses = await getExpensesForCycle(supabase, cycleId);
  return { cycle, expenses, summary: computeSummary(expenses) };
}
