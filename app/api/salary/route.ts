import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";
import { toErrorMessage } from "@/lib/errors";
import {
  getBonuses,
  getSalaryAllocations,
  getSalaryMonths,
  upsertSalaryMonth,
} from "@/lib/salary-service";
import { parseSalaryMonthInput, ValidationError } from "@/lib/tracker-validation";

export const dynamic = "force-dynamic";

/**
 * Everything the Salary page needs, in one request.
 *
 * Kept out of /api/bootstrap on purpose: this data is used on exactly one
 * page, and loading it on every page would put three extra queries in front
 * of every navigation.
 */
export async function GET() {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();

    const [months, allocations, bonuses] = await Promise.all([
      getSalaryMonths(supabase, userId),
      getSalaryAllocations(supabase, userId),
      getBonuses(supabase, userId),
    ]);

    return NextResponse.json({ months, allocations, bonuses });
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

/** Sets — or with an amount of 0, clears — one month's salary. */
export async function PUT(req: Request) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const input = parseSalaryMonthInput(await req.json());
    const saved = await upsertSalaryMonth(supabase, userId, input);
    return NextResponse.json(saved ?? { cleared: true });
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
