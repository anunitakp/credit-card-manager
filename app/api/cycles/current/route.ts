import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrCreateCurrentCycle, getCycleWithExpenses } from "@/lib/cycle-service";
import { toErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const cycle = await getOrCreateCurrentCycle(supabase);
    const data = await getCycleWithExpenses(supabase, cycle.id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
