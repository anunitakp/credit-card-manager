import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCycleById } from "@/lib/cycle-service";
import { CardError, getCardById } from "@/lib/card-service";
import { parseExpenseInput, ValidationError } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const body = (await req.json()) as Record<string, unknown>;

    const cycleId = typeof body.cycle_id === "string" ? body.cycle_id : "";
    if (!cycleId) {
      return NextResponse.json({ error: "cycle_id is required." }, { status: 400 });
    }

    // Scoped by user: a cycle id belonging to another account reads as
    // "not found" rather than as someone else's cycle.
    const cycle = await getCycleById(supabase, userId, cycleId);
    if (!cycle) {
      return NextResponse.json({ error: "Billing cycle not found." }, { status: 404 });
    }
    // An archived card takes no new spending. Checked here rather than only
    // in the interface, so an open tab from before the card was archived
    // cannot write to it.
    const card = cycle.card_id ? await getCardById(supabase, userId, cycle.card_id) : null;
    if (card?.archived_at) {
      return NextResponse.json(
        { error: `${card.name} is archived. Restore it before adding expenses to it.` },
        { status: 400 }
      );
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
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    if (err instanceof CardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
