import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { toErrorMessage } from "@/lib/errors";
import { deleteNote, updateNote } from "@/lib/tracker-service";
import { parseNoteInput, ValidationError } from "@/lib/tracker-validation";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    const input = parseNoteInput(await req.json());
    const updated = await updateNote(supabase, params.id, input);
    if (!updated) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    const deleted = await deleteNote(supabase, params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
