import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  claimOrphanedData,
  countUsers,
  findUserByUsername,
  getAuthSecret,
  hashPassword,
} from "@/lib/auth";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  USER_COOKIE,
  createSessionToken,
} from "@/lib/session";
import { toErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: Request) {
  try {
    const secret = getAuthSecret();
    const supabase = getSupabaseServerClient();
    const body = (await req.json()) as { username?: string; password?: string };

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (username.length < 2 || username.length > 40) {
      return NextResponse.json(
        { error: "Username must be between 2 and 40 characters." },
        { status: 400 }
      );
    }
    if (!/^[\w .-]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can use letters, numbers, spaces, dots, dashes and underscores." },
        { status: 400 }
      );
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (await findUserByUsername(supabase, username)) {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }

    // Whether this is the very first account decides if it adopts the data
    // that predates accounts existing. Checked before the insert, so the new
    // row does not count itself.
    const isFirstAccount = (await countUsers(supabase)) === 0;

    const { data, error } = await supabase
      .from("users")
      .insert({ username, password_hash: hashPassword(password) })
      .select("id, username")
      .single();

    if (error) {
      // The unique index is the real guard against two people registering the
      // same name at the same moment; the check above is only for a good
      // error message.
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json({ error: "That username is taken." }, { status: 409 });
      }
      throw error;
    }

    if (isFirstAccount) {
      await claimOrphanedData(supabase, data.id);
    }

    const token = await createSessionToken(
      { userId: data.id, username: data.username },
      secret
    );
    const response = NextResponse.json({
      username: data.username,
      claimedExistingData: isFirstAccount,
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    // Readable by the client so the UI can show the name without the layout
    // having to read cookies on the server. Carries no authority.
    response.cookies.set(USER_COOKIE, encodeURIComponent(data.username), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
