import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";
import { deleteUpiExpense, updateUpiExpense } from "@/lib/tracker-service";
import { parseUpiExpenseInput, ValidationError } from "@/lib/tracker-validation";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const input = parseUpiExpenseInput(await req.json());
    const updated = await updateUpiExpense(supabase, userId, params.id, input);
    if (!updated) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const deleted = await deleteUpiExpense(supabase, userId, params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
