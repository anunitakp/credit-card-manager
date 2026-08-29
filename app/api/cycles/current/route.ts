import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrCreateCurrentCycle, getCycleWithExpenses } from "@/lib/cycle-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const cycle = await getOrCreateCurrentCycle(supabase);
    const data = await getCycleWithExpenses(supabase, cycle.id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
