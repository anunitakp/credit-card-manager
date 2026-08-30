import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCycleWithExpenses } from "@/lib/cycle-service";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const data = await getCycleWithExpenses(supabase, userId, params.id);
    if (!data) {
      return NextResponse.json({ error: "Billing cycle not found." }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
