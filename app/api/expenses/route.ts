import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCycleById } from "@/lib/cycle-service";
import { parseExpenseInput, ValidationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = (await req.json()) as Record<string, unknown>;

    const cycleId = typeof body.cycle_id === "string" ? body.cycle_id : "";
    if (!cycleId) {
      return NextResponse.json({ error: "cycle_id is required." }, { status: 400 });
    }

    const cycle = await getCycleById(supabase, cycleId);
    if (!cycle) {
      return NextResponse.json({ error: "Billing cycle not found." }, { status: 404 });
    }
    if (cycle.status !== "open") {
      return NextResponse.json(
        { error: "This billing cycle is closed and archived; it cannot be modified." },
        { status: 400 }
      );
    }

    const input = parseExpenseInput(body);

    const { data, error } = await supabase
      .from("expenses")
      .insert({ ...input, cycle_id: cycleId })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
