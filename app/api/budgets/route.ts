import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { toErrorMessage } from "@/lib/errors";
import { getAllBudgets, upsertBudget } from "@/lib/tracker-service";
import { parseBudgetInput, ValidationError } from "@/lib/tracker-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    return NextResponse.json(await getAllBudgets(supabase));
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

/** Sets — or, with an amount of 0, clears — one budget for one month. */
export async function PUT(req: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const input = parseBudgetInput(await req.json());
    const budget = await upsertBudget(supabase, input);
    return NextResponse.json(budget ?? { cleared: true });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
