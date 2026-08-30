import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCycleById } from "@/lib/cycle-service";
import { parseExpenseInput, ValidationError } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";

export const dynamic = "force-dynamic";

/**
 * Resolves an expense to its billing cycle, confirming the cycle belongs to
 * the signed-in account.
 *
 * `expenses` carries no `user_id` of its own — ownership lives on the cycle —
 * so every route touching one expense has to come through here. A cycle
 * belonging to someone else reads as "not found", which is the same answer an
 * id that does not exist gets: nothing about another account's data leaks,
 * not even whether a given id is real.
 */
async function findOwnedCycle(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  expenseId: string
): Promise<{ error: NextResponse } | { cycle: { id: string; status: string } }> {
  const { data: expense, error } = await supabase
    .from("expenses")
    .select("cycle_id")
    .eq("id", expenseId)
    .maybeSingle();

  if (error) throw error;

  const cycle = expense ? await getCycleById(supabase, userId, expense.cycle_id) : null;
  if (!cycle) {
    return { error: NextResponse.json({ error: "Expense not found." }, { status: 404 }) };
  }

  return { cycle };
}

/** As above, but also rejects archived cycles, which are read-only. */
async function assertEditable(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  expenseId: string
): Promise<{ error: NextResponse } | { cycleId: string }> {
  const found = await findOwnedCycle(supabase, userId, expenseId);
  if ("error" in found) return found;

  if (found.cycle.status !== "open") {
    return {
      error: NextResponse.json(
        { error: "This expense belongs to a closed, archived billing cycle and cannot be modified." },
        { status: 400 }
      ),
    };
  }

  return { cycleId: found.cycle.id };
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
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    // Archived expenses are readable, just not editable, so this uses the
    // ownership check without the open-cycle requirement.
    const check = await findOwnedCycle(supabase, userId, params.id);
    if ("error" in check) return check.error;

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
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const check = await assertEditable(supabase, userId, params.id);
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
    const check = await assertEditable(supabase, userId, params.id);
    if ("error" in check) return check.error;

    const { error } = await supabase.from("expenses").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
