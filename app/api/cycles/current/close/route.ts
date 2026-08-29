import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { closeCycle, getOrCreateCurrentCycle, getCycleWithExpenses } from "@/lib/cycle-service";
import { toErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();
    const current = await getOrCreateCurrentCycle(supabase);

    if (current.status !== "open") {
      return NextResponse.json({ error: "No open billing cycle to close." }, { status: 400 });
    }

    await closeCycle(supabase, current.id);
    const next = await getOrCreateCurrentCycle(supabase);
    const data = await getCycleWithExpenses(supabase, next.id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
