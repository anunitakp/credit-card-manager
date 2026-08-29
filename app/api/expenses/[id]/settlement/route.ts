import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCycleById } from "@/lib/cycle-service";
import { toErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    const body = (await req.json()) as Record<string, unknown>;

    const status = body.settlement_status;
    if (status !== "settled" && status !== "not_settled") {
      return NextResponse.json(
        { error: "settlement_status must be 'settled' or 'not_settled'." },
        { status: 400 }
      );
    }

    const { data: expense, error: fetchError } = await supabase
      .from("expenses")
      .select("cycle_id")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!expense) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    const cycle = await getCycleById(supabase, expense.cycle_id);
    if (!cycle || cycle.status !== "open") {
      return NextResponse.json(
        { error: "This expense belongs to a closed, archived billing cycle and cannot be modified." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("expenses")
      .update({ settlement_status: status, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
