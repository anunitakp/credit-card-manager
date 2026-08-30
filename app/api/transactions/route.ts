import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";
import { getAllTransactions } from "@/lib/tracker-service";

export const dynamic = "force-dynamic";

/**
 * Every transaction, credit-card and UPI alike, newest first.
 *
 * The whole history is returned in one request on purpose: a personal
 * tracker is a few thousand rows at most, and holding all of it client-side
 * is what lets the dashboard, budget, statistics and expenses pages all
 * derive from the same in-memory list without any of them disagreeing.
 */
export async function GET() {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const transactions = await getAllTransactions(supabase, userId);
    return NextResponse.json(transactions);
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
