import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { CardError, setCardArchived } from "@/lib/card-service";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";

export const dynamic = "force-dynamic";

/**
 * Archive or restore a card. Deliberately its own endpoint rather than a
 * field on the edit form: retiring a card is a different decision from
 * renaming one, and folding it into the same PATCH would make an ordinary
 * rename capable of retiring a card by omission.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const body = (await req.json()) as Record<string, unknown>;
    const archived = body.archived !== false;
    return NextResponse.json(await setCardArchived(supabase, userId, params.id, archived));
  } catch (err) {
    const unauthorized = unauthorizedResponse(err);
    if (unauthorized) return unauthorized;
    if (err instanceof CardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
