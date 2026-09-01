import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";
import { getTripLinks, linkExpenseToTrip, TripLinkError } from "@/lib/trip-link-service";
import { parseTripLinkInput, ValidationError } from "@/lib/tracker-validation";
import { toErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    return NextResponse.json(await getTripLinks(supabase, userId));
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

/** Files an expense against a trip, or moves it to a different one. */
export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const input = parseTripLinkInput(await req.json());
    return NextResponse.json(await linkExpenseToTrip(supabase, userId, input), {
      status: 201,
    });
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    if (err instanceof ValidationError || err instanceof TripLinkError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
