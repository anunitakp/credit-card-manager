import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";
import { createUpiExpense } from "@/lib/tracker-service";
import { parseUpiExpenseInput, ValidationError } from "@/lib/tracker-validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const input = parseUpiExpenseInput(await req.json());
    const created = await createUpiExpense(supabase, userId, input);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
