import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCycleById, getCycleWithExpenses } from "@/lib/cycle-service";
import { CardError, resolveCard } from "@/lib/card-service";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();

    // The card comes from the cycle rather than the query string: an archive
    // link should open on the card it was actually filed under, whichever
    // card the user happened to be looking at when they clicked it.
    const cycle = await getCycleById(supabase, userId, params.id);
    if (!cycle) {
      return NextResponse.json({ error: "Billing cycle not found." }, { status: 404 });
    }
    const card = await resolveCard(supabase, userId, cycle.card_id);

    const data = await getCycleWithExpenses(supabase, userId, params.id, card);
    if (!data) {
      return NextResponse.json({ error: "Billing cycle not found." }, { status: 404 });
    }
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
