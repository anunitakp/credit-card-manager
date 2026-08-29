import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { computeSummary, getExpensesForCycle } from "@/lib/cycle-service";
import { ArchiveListItem, BillingCycle } from "@/lib/types";
import { toErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data: cycles, error } = await supabase
      .from("billing_cycles")
      .select("*")
      .eq("status", "closed")
      .order("start_date", { ascending: false });

    if (error) throw error;

    const items: ArchiveListItem[] = await Promise.all(
      ((cycles as BillingCycle[]) ?? []).map(async (cycle) => {
        const expenses = await getExpensesForCycle(supabase, cycle.id);
        const summary = computeSummary(expenses);
        return {
          id: cycle.id,
          start_date: cycle.start_date,
          end_date: cycle.end_date,
          closed_at: cycle.closed_at,
          totalSpending: summary.totalSpending,
          mySpending: summary.mySpending,
        };
      })
    );

    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
