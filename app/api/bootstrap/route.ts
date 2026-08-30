import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  getAllBudgets,
  getAllNotes,
  getAllTransactions,
  getAllTrips,
} from "@/lib/tracker-service";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";
import { toErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * Everything the app needs to start, in one request.
 *
 * The tracker holds all four collections in memory and derives every page
 * from them, so it used to fetch four endpoints on mount. Each one was a
 * separate round trip to the server *and* a separate round trip on to
 * Supabase, and the app could not render until the slowest finished — around
 * 600ms of mostly waiting.
 *
 * Bundling them costs one round trip, and the four queries run concurrently
 * on the server where they are next door to the database. The individual
 * endpoints still exist for targeted refreshes after a mutation.
 */
export async function GET() {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();

    const [transactions, budgets, trips, notes] = await Promise.all([
      getAllTransactions(supabase, userId),
      getAllBudgets(supabase, userId),
      getAllTrips(supabase, userId),
      getAllNotes(supabase, userId),
    ]);

    return NextResponse.json({ transactions, budgets, trips, notes });
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
