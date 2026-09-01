import { SupabaseClient } from "@supabase/supabase-js";
import { TripExpenseLink, TripExpenseLinkInput } from "./types";

/**
 * Links between trips and the expenses filed against them.
 *
 * Nothing here moves or copies an expense. A link is a pointer, so an expense
 * assigned to a trip is still the same single row in the Expenses list and in
 * its credit-card cycle — which is what stops a trip total and a monthly
 * total from ever disagreeing about the same rupee.
 */

/**
 * Links for one account, minus any whose expense has since been deleted.
 *
 * The link table cannot have a foreign key on `transaction_id`: that id comes
 * from a view over two tables, so there is nothing to point at. Orphans are
 * therefore possible, and are dropped on read rather than being allowed to
 * show up as a trip line with no expense behind it.
 */
export async function getTripLinks(
  supabase: SupabaseClient,
  userId: string
): Promise<TripExpenseLink[]> {
  const { data, error } = await supabase
    .from("trip_expense_links")
    .select("id, trip_id, transaction_id, trip_category")
    .eq("user_id", userId);

  if (error) throw error;
  const links = (data as TripExpenseLink[]) ?? [];
  if (links.length === 0) return [];

  const { data: alive, error: aliveError } = await supabase
    .from("all_transactions")
    .select("id")
    .eq("user_id", userId)
    .in(
      "id",
      links.map((l) => l.transaction_id)
    );
  if (aliveError) throw aliveError;

  const aliveIds = new Set((alive ?? []).map((t: { id: string }) => t.id));
  return links.filter((l) => aliveIds.has(l.transaction_id));
}

export class TripLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripLinkError";
  }
}

/**
 * Files an expense against a trip, or moves it to a different one.
 *
 * Both the trip and the expense are checked to belong to the caller first —
 * an id from another account reads as "not found", the same answer an id that
 * does not exist gets.
 */
export async function linkExpenseToTrip(
  supabase: SupabaseClient,
  userId: string,
  input: TripExpenseLinkInput
): Promise<TripExpenseLink> {
  const [{ data: trip, error: tripError }, { data: txn, error: txnError }] =
    await Promise.all([
      supabase
        .from("trips")
        .select("id")
        .eq("id", input.trip_id)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("all_transactions")
        .select("id, category")
        .eq("id", input.transaction_id)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (tripError) throw tripError;
  if (txnError) throw txnError;
  if (!trip) throw new TripLinkError("That trip no longer exists.");
  if (!txn) throw new TripLinkError("That expense no longer exists.");

  // Only Trip-category expenses belong on a trip. Without this an ordinary
  // grocery run could be filed under a holiday and quietly leave the monthly
  // totals it should be counted in.
  if ((txn as { category: string }).category !== "Trip") {
    throw new TripLinkError("Only expenses in the Trip category can be added to a trip.");
  }

  const { data, error } = await supabase
    .from("trip_expense_links")
    .upsert(
      {
        user_id: userId,
        trip_id: input.trip_id,
        transaction_id: input.transaction_id,
        trip_category: input.trip_category,
      },
      { onConflict: "user_id,transaction_id" }
    )
    .select("id, trip_id, transaction_id, trip_category")
    .single();

  if (error) throw error;
  return data as TripExpenseLink;
}

/** Removes an expense from whichever trip it was filed against. */
export async function unlinkExpense(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string
): Promise<boolean> {
  const { error, count } = await supabase
    .from("trip_expense_links")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("transaction_id", transactionId);

  if (error) throw error;
  return (count ?? 0) > 0;
}
