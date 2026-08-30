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

/**
 * Every function here takes a `userId` and applies it to the query.
 *
 * That is not belt-and-braces on top of the middleware: middleware only
 * proves *someone* is signed in, not that the row they asked for is theirs.
 * Updates and deletes match on `id` AND `user_id` together, so passing
 * another account's row id simply affects nothing rather than being an
 * authorisation check that could be forgotten.
 */

/* ==================================================================
   Transactions — read-only union of credit-card and UPI expenses.
   ================================================================== */

export async function getAllTransactions(
  supabase: SupabaseClient,
  userId: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("all_transactions")
    .select("*")
    .eq("user_id", userId)
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
  userId: string,
  input: UpiExpenseInput
) {
  const { data, error } = await supabase
    .from("upi_expenses")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateUpiExpense(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: UpiExpenseInput
) {
  const { data, error } = await supabase
    .from("upi_expenses")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteUpiExpense(
  supabase: SupabaseClient,
  userId: string,
  id: string
) {
  const { error, count } = await supabase
    .from("upi_expenses")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ==================================================================
   Budgets — one standing set per account, applied to every month.
   ================================================================== */

export async function getAllBudgets(
  supabase: SupabaseClient,
  userId: string
): Promise<Budget[]> {
  const { data, error } = await supabase.from("budgets").select("*").eq("user_id", userId);

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
  userId: string,
  input: BudgetInput
): Promise<Budget | null> {
  const { category, amount } = input;

  if (amount <= 0) {
    const deletion = supabase.from("budgets").delete().eq("user_id", userId);
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
  const lookup = supabase.from("budgets").select("id").eq("user_id", userId);
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
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return { ...(data as Budget), amount: Number(data.amount) };
  }

  const { data, error } = await supabase
    .from("budgets")
    .insert({ category, amount, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return { ...(data as Budget), amount: Number(data.amount) };
}

/* ==================================================================
   Trips
   ================================================================== */

export async function getAllTrips(
  supabase: SupabaseClient,
  userId: string
): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .order("trip_date", { ascending: false });

  if (error) throw error;
  return ((data as Trip[]) ?? []).map((t) => ({
    ...t,
    total_amount: Number(t.total_amount),
  }));
}

export async function createTrip(
  supabase: SupabaseClient,
  userId: string,
  input: TripInput
) {
  const { data, error } = await supabase
    .from("trips")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTrip(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: TripInput
) {
  const { data, error } = await supabase
    .from("trips")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteTrip(supabase: SupabaseClient, userId: string, id: string) {
  const { error, count } = await supabase
    .from("trips")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ==================================================================
   Notes

   `created_at` is selected only to give the list a stable newest-first
   order — no timestamp is ever shown in the UI.
   ================================================================== */

export async function getAllNotes(
  supabase: SupabaseClient,
  userId: string
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Note[]) ?? [];
}

export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  input: NoteInput
) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: NoteInput
) {
  const { data, error } = await supabase
    .from("notes")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteNote(supabase: SupabaseClient, userId: string, id: string) {
  const { error, count } = await supabase
    .from("notes")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
