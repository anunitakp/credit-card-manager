import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { closeCycle, getOrCreateCurrentCycle, getCycleWithExpenses } from "@/lib/cycle-service";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";
import { formatDateLabel, isCycleClosable } from "@/lib/billing-cycle";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const current = await getOrCreateCurrentCycle(supabase, userId);

    if (current.status !== "open") {
      return NextResponse.json({ error: "No open billing cycle to close." }, { status: 400 });
    }

    if (!isCycleClosable(current.end_date)) {
      return NextResponse.json(
        {
          error: `This billing cycle can't be closed yet — it runs through ${formatDateLabel(
            current.end_date
          )}. You can close it starting the day after.`,
        },
        { status: 400 }
      );
    }

    await closeCycle(supabase, userId, current.id);
    const next = await getOrCreateCurrentCycle(supabase, userId);
    const data = await getCycleWithExpenses(supabase, userId, next.id);
    return NextResponse.json(data);
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
