import { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_BILL_DAY } from "./billing-cycle";
import { Card, CardInput, CardSummary } from "./types";

/** A card problem the caller should report to the user, not a 500. */
export class CardError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "CardError";
  }
}

const CARD_FIELDS = "id, name, bill_day, archived_at, created_at";

export function parseCardInput(body: Record<string, unknown>): CardInput {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) throw new CardError("Give the card a name, e.g. “HDFC Card”.");
  if (name.length > 40) throw new CardError("Card names are limited to 40 characters.");

  const raw = body.bill_day;
  const billDay =
    raw === undefined || raw === null || raw === "" ? DEFAULT_BILL_DAY : Number(raw);
  if (!Number.isInteger(billDay) || billDay < 1 || billDay > 31) {
    throw new CardError("The bill date must be a whole number between 1 and 31.");
  }

  return { name, bill_day: billDay };
}

/**
 * The cards on an account.
 *
 * Archived cards are excluded unless asked for: they are retired, so they
 * should not clutter a switcher or a picker. Their *expenses* are never
 * hidden — those come from the transactions view, which knows nothing about
 * archiving.
 */
export async function listCards(
  supabase: SupabaseClient,
  userId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<Card[]> {
  let query = supabase.from("cards").select(CARD_FIELDS).eq("user_id", userId);
  if (!includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Card[]) ?? [];
}

/**
 * The cards on an account, each with its expense count attached.
 *
 * Counted here rather than in the client so the answer cannot depend on
 * which migrations a database has had: it walks `cards → billing_cycles →
 * expenses`, all of which have existed since the cards feature shipped.
 */
export async function listCardSummaries(
  supabase: SupabaseClient,
  userId: string,
  options: { includeArchived?: boolean } = {}
): Promise<CardSummary[]> {
  const cards = await listCards(supabase, userId, options);
  return Promise.all(
    cards.map(async (card) => ({
      ...card,
      expense_count: await countCardExpenses(supabase, userId, card.id),
    }))
  );
}

export async function getCardById(
  supabase: SupabaseClient,
  userId: string,
  cardId: string
): Promise<Card | null> {
  const { data, error } = await supabase
    .from("cards")
    .select(CARD_FIELDS)
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as Card) ?? null;
}

export async function createCard(
  supabase: SupabaseClient,
  userId: string,
  input: CardInput
): Promise<Card> {
  const { data, error } = await supabase
    .from("cards")
    .insert({ ...input, user_id: userId })
    .select(CARD_FIELDS)
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new CardError(
        `You already have a card called “${input.name}”. If it is archived, restore it instead of adding it again.`,
        409
      );
    }
    throw error;
  }
  return data as Card;
}

export async function updateCard(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
  input: CardInput
): Promise<Card> {
  const { data, error } = await supabase
    .from("cards")
    .update(input)
    .eq("id", cardId)
    .eq("user_id", userId)
    .select(CARD_FIELDS)
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new CardError(`You already have a card called “${input.name}”.`, 409);
    }
    throw error;
  }
  if (!data) throw new CardError("Card not found.", 404);
  return data as Card;
}

/**
 * How many expenses are recorded on a card, across every month.
 *
 * Two queries rather than a join because PostgREST cannot count through a
 * relationship; the cycle list is a handful of rows either way.
 */
export async function countCardExpenses(
  supabase: SupabaseClient,
  userId: string,
  cardId: string
): Promise<number> {
  const { data: cycles, error } = await supabase
    .from("billing_cycles")
    .select("id")
    .eq("user_id", userId)
    .eq("card_id", cardId);

  if (error) throw error;
  const ids = (cycles ?? []).map((c) => c.id as string);
  if (ids.length === 0) return 0;

  const { count, error: countError } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .in("cycle_id", ids);

  if (countError) throw countError;
  return count ?? 0;
}

/**
 * Retires a card without touching a single expense.
 *
 * This is the answer to "I don't use this card any more". It leaves the
 * switcher and the add-expense picker; everything ever spent on it stays in
 * the Expenses tab, the statistics and the archives, because those read the
 * transactions view, which does not care whether a card is archived.
 * Reversible at any time.
 */
export async function setCardArchived(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
  archived: boolean
): Promise<Card> {
  if (archived) {
    // Archiving the only card you can still use would leave the page with
    // nothing to show, and it would quietly create a replacement.
    const active = await listCards(supabase, userId);
    if (active.length <= 1 && active.some((c) => c.id === cardId)) {
      throw new CardError(
        "This is your only active card. Add another one before archiving this one."
      );
    }
  }

  const { data, error } = await supabase
    .from("cards")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", cardId)
    .eq("user_id", userId)
    .select(CARD_FIELDS)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new CardError("Card not found.", 404);
  return data as Card;
}

/**
 * Deletes a card — but only one that has never been spent on.
 *
 * This exists for the card added by mistake, and nothing else. A card with
 * any history cannot be deleted through here, and cannot be deleted around
 * here either: the expenses → billing_cycles foreign key is RESTRICT, so
 * Postgres refuses the cascade regardless of what the app believes. The
 * check below is only here to turn that database error into a sentence
 * worth reading.
 */
export async function deleteCard(
  supabase: SupabaseClient,
  userId: string,
  cardId: string
): Promise<void> {
  const all = await listCards(supabase, userId, { includeArchived: true });
  const card = all.find((c) => c.id === cardId);
  if (!card) throw new CardError("Card not found.", 404);

  const expenses = await countCardExpenses(supabase, userId, cardId);
  if (expenses > 0) {
    throw new CardError(
      `${card.name} has ${expenses} ${expenses === 1 ? "expense" : "expenses"} on it, so it can’t be deleted — that spending would go with it. Archive it instead: it leaves the switcher and every total stays intact.`,
      409
    );
  }

  const active = all.filter((c) => c.archived_at === null);
  if (active.length <= 1 && card.archived_at === null) {
    throw new CardError("This is your only card. Add another one before removing it.");
  }

  const { error } = await supabase.from("cards").delete().eq("id", cardId).eq("user_id", userId);
  if (error) {
    // The RESTRICT foreign key, if anything slipped past the count above.
    if ((error as { code?: string }).code === "23503") {
      throw new CardError(
        `${card.name} has spending recorded on it and cannot be deleted. Archive it instead.`,
        409
      );
    }
    throw error;
  }
}

/**
 * The card a request should act on when it did not name one.
 *
 * An archived card is still addressable by id — you can open it to look at
 * its history or restore it — but it is never the fallback, and a brand-new
 * account gets its implicit first card here.
 */
export async function resolveCard(
  supabase: SupabaseClient,
  userId: string,
  cardId?: string | null
): Promise<Card> {
  if (cardId) {
    const card = await getCardById(supabase, userId, cardId);
    if (!card) throw new CardError("Card not found.", 404);
    return card;
  }

  const active = await listCards(supabase, userId);
  if (active.length > 0) return active[0];

  // Every card archived, or none yet. Fall back to any card before creating
  // one, so an account that archived everything does not sprout duplicates.
  const all = await listCards(supabase, userId, { includeArchived: true });
  if (all.length > 0) return all[0];

  return createCard(supabase, userId, { name: "HDFC Card", bill_day: DEFAULT_BILL_DAY });
}
