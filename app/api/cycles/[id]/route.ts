import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCycleWithExpenses } from "@/lib/cycle-service";
import { toErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    const data = await getCycleWithExpenses(supabase, params.id);
    if (!data) {
      return NextResponse.json({ error: "Billing cycle not found." }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
