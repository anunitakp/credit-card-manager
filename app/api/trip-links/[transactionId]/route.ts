import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";
import { unlinkExpense } from "@/lib/trip-link-service";
import { toErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** Takes an expense off whichever trip it was filed against. */
export async function DELETE(
  _req: Request,
  { params }: { params: { transactionId: string } }
) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const removed = await unlinkExpense(supabase, userId, params.transactionId);
    if (!removed) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
