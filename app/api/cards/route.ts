import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  CardError,
  createCard,
  listCardSummaries,
  parseCardInput,
  resolveCard,
} from "@/lib/card-service";
import { toErrorMessage } from "@/lib/errors";
import { requireUser, unauthorizedResponse } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();

    // An account always has at least one card: `resolveCard` creates the
    // implicit first one, so the page has no "no cards" state to design for.
    await resolveCard(supabase, userId);

    const includeArchived =
      new URL(req.url).searchParams.get("includeArchived") === "1";
    return NextResponse.json(await listCardSummaries(supabase, userId, { includeArchived }));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseServerClient();
    const input = parseCardInput((await req.json()) as Record<string, unknown>);
    return NextResponse.json(await createCard(supabase, userId, input), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  const unauthorized = unauthorizedResponse(err);
  if (unauthorized) return unauthorized;
  if (err instanceof CardError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
}
