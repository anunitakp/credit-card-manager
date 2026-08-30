import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrCreateCurrentCycle, getCycleWithExpenses } from "@/lib/cycle-service";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const cycle = await getOrCreateCurrentCycle(supabase, userId);
    const data = await getCycleWithExpenses(supabase, userId, cycle.id);
    return NextResponse.json(data);
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
