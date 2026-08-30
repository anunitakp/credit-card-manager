import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCycleById } from "@/lib/cycle-service";
import { parseExpenseInput, ValidationError } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

async function assertEditable(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  expenseId: string
): Promise<{ error: NextResponse } | { cycleId: string }> {
  const { data: expense, error } = await supabase
    .from("expenses")
    .select("cycle_id")
    .eq("id", expenseId)
    .maybeSingle();

  if (error) throw error;
  if (!expense) {
    return { error: NextResponse.json({ error: "Expense not found." }, { status: 404 }) };
  }

  const cycle = await getCycleById(supabase, expense.cycle_id);
  if (!cycle || cycle.status !== "open") {
    return {
      error: NextResponse.json(
        { error: "This expense belongs to a closed, archived billing cycle and cannot be modified." },
        { status: 400 }
      ),
    };
  }

  return { cycleId: expense.cycle_id };
}

/**
 * A single credit-card expense, in full.
 *
 * The expense tracker shows these through the `all_transactions` view,
 * which only carries `my_spending`. Editing one needs the underlying
 * total/others split, so it is fetched here rather than reconstructed.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    const check = await assertEditable(supabase, params.id);
    if ("error" in check) return check.error;

    const body = (await req.json()) as Record<string, unknown>;
    const input = parseExpenseInput(body);

    const { data, error } = await supabase
      .from("expenses")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    const check = await assertEditable(supabase, params.id);
    if ("error" in check) return check.error;

    const { error } = await supabase.from("expenses").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
