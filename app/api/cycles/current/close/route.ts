import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { closeCycle, getOrCreateCurrentCycle, getCycleWithExpenses } from "@/lib/cycle-service";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";
import { isCycleClosable, ordinalDay } from "@/lib/billing-cycle";
import { CardError, resolveCard } from "@/lib/card-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();

    // Closing is per card: each card's statement falls on its own day, so
    // one card's month ending says nothing about another's.
    const cardId = new URL(req.url).searchParams.get("cardId");
    const card = await resolveCard(supabase, userId, cardId);

    const current = await getOrCreateCurrentCycle(supabase, userId, card);

    if (current.status !== "open") {
      return NextResponse.json({ error: "No open billing cycle to close." }, { status: 400 });
    }

    if (!isCycleClosable(current.end_date)) {
      return NextResponse.json(
        {
          error: `You can close this month once ${card.name}'s bill date — the ${ordinalDay(
            card.bill_day
          )} — has passed.`,
        },
        { status: 400 }
      );
    }

    await closeCycle(supabase, userId, current.id);
    const next = await getOrCreateCurrentCycle(supabase, userId, card);
    const data = await getCycleWithExpenses(supabase, userId, next.id, card);
    return NextResponse.json(data);
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    if (err instanceof CardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
