import { SupabaseClient } from "@supabase/supabase-js";
import {
  Budget,
  BudgetInput,
  Note,
  NoteInput,
  Transaction,
  Trip,
  TripInput,
  UpiExpenseInput,
} from "./types";

/* ==================================================================
   Transactions — read-only union of credit-card and UPI expenses.

   Everything the tracker displays comes from here. There is no copy of
   a credit-card expense anywhere, so there is nothing that can drift
   out of sync and no way to double-count one.
   ================================================================== */

export async function getAllTransactions(
  supabase: SupabaseClient
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("all_transactions")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Postgres returns numeric columns as strings through PostgREST; coerce
  // once here so every consumer can treat `amount` as a number.
  return ((data as Transaction[]) ?? []).map((t) => ({
    ...t,
    amount: Number(t.amount),
  }));
}

/* ==================================================================
   UPI expenses — the only transactions the tracker itself owns.
   ================================================================== */

export async function createUpiExpense(
  supabase: SupabaseClient,
  input: UpiExpenseInput
) {
  const { data, error } = await supabase
    .from("upi_expenses")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateUpiExpense(
  supabase: SupabaseClient,
  id: string,
  input: UpiExpenseInput
) {
  const { data, error } = await supabase
    .from("upi_expenses")
    .update(input)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteUpiExpense(supabase: SupabaseClient, id: string) {
  const { error, count } = await supabase
    .from("upi_expenses")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ==================================================================
   Budgets — one standing set, applied to every month until changed.
   ================================================================== */

export async function getAllBudgets(supabase: SupabaseClient): Promise<Budget[]> {
  const { data, error } = await supabase.from("budgets").select("*");

  if (error) throw error;
  return ((data as Budget[]) ?? []).map((b) => ({ ...b, amount: Number(b.amount) }));
}

/**
 * Sets the budget for one category, or for the month overall when `category`
 * is null.
 *
 * An amount of 0 clears the budget entirely rather than storing a zero, so
 * "no budget set" stays distinguishable from "a budget of zero" — the first
 * shows no progress bar, the second would report the category as instantly
 * over budget.
 */
export async function upsertBudget(
  supabase: SupabaseClient,
  input: BudgetInput
): Promise<Budget | null> {
  const { category, amount } = input;

  if (amount <= 0) {
    const deletion = supabase.from("budgets").delete();
    const { error } =
      category === null
        ? await deletion.is("category", null)
        : await deletion.eq("category", category);
    if (error) throw error;
    return null;
  }

  // The two unique indexes are partial — one for `category is null`, one for
  // everything else — and a PostgREST upsert cannot target a partial index,
  // so the update-then-insert is done explicitly.
  const lookup = supabase.from("budgets").select("id");
  const { data: existing, error: findError } = await (category === null
    ? lookup.is("category", null)
    : lookup.eq("category", category)
  ).maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { data, error } = await supabase
      .from("budgets")
      .update({ amount })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return { ...(data as Budget), amount: Number(data.amount) };
  }

  const { data, error } = await supabase
    .from("budgets")
    .insert({ category, amount })
    .select("*")
    .single();
  if (error) throw error;
  return { ...(data as Budget), amount: Number(data.amount) };
}

/* ==================================================================
   Trips
   ================================================================== */

export async function getAllTrips(supabase: SupabaseClient): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("trip_date", { ascending: false });

  if (error) throw error;
  return ((data as Trip[]) ?? []).map((t) => ({
    ...t,
    total_amount: Number(t.total_amount),
  }));
}

export async function createTrip(supabase: SupabaseClient, input: TripInput) {
  const { data, error } = await supabase.from("trips").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateTrip(
  supabase: SupabaseClient,
  id: string,
  input: TripInput
) {
  const { data, error } = await supabase
    .from("trips")
    .update(input)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteTrip(supabase: SupabaseClient, id: string) {
  const { error, count } = await supabase
    .from("trips")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ==================================================================
   Notes

   `created_at` is selected only to give the list a stable newest-first
   order — no timestamp is ever shown in the UI.
   ================================================================== */

export async function getAllNotes(supabase: SupabaseClient): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Note[]) ?? [];
}

export async function createNote(supabase: SupabaseClient, input: NoteInput) {
  const { data, error } = await supabase.from("notes").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateNote(
  supabase: SupabaseClient,
  id: string,
  input: NoteInput
) {
  const { data, error } = await supabase
    .from("notes")
    .update(input)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteNote(supabase: SupabaseClient, id: string) {
  const { error, count } = await supabase
    .from("notes")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}
