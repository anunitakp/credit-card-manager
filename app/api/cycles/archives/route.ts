import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { computeSummary, getExpensesForCycle } from "@/lib/cycle-service";
import { ArchiveListItem, BillingCycle } from "@/lib/types";
import { listCards } from "@/lib/card-service";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();

    // Optional: the Archives page can show one card or all of them.
    const cardId = new URL(req.url).searchParams.get("cardId");

    let query = supabase
      .from("billing_cycles")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "closed");
    if (cardId) query = query.eq("card_id", cardId);

    const { data: cycles, error } = await query.order("start_date", { ascending: false });

    if (error) throw error;

    // Named here rather than joined per row: an account has a handful of
    // cards, so one lookup beats a join repeated for every archived month.
    const cardNames = new Map((await listCards(supabase, userId)).map((c) => [c.id, c.name]));

    const items: ArchiveListItem[] = await Promise.all(
      ((cycles as BillingCycle[]) ?? []).map(async (cycle) => {
        const expenses = await getExpensesForCycle(supabase, cycle.id);
        const summary = computeSummary(expenses);
        return {
          id: cycle.id,
          card_id: cycle.card_id,
          card_name: cardNames.get(cycle.card_id) ?? "Card",
          start_date: cycle.start_date,
          end_date: cycle.end_date,
          closed_at: cycle.closed_at,
          totalSpending: summary.totalSpending,
          mySpending: summary.mySpending,
        };
      })
    );

    return NextResponse.json(items);
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
