import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { findUserByUsername, getAuthSecret, verifyPassword } from "@/lib/auth";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  USER_COOKIE,
  createSessionToken,
} from "@/lib/session";
import { toErrorMessage } from "@/lib/errors";

// scrypt is Node-only, so this handler must not run on the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const secret = getAuthSecret();
    const supabase = getSupabaseServerClient();
    const body = (await req.json()) as { username?: string; password?: string };

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const user = username ? await findUserByUsername(supabase, username) : null;

    // The password is verified even when the user does not exist, against a
    // throwaway hash, so that "no such account" and "wrong password" take the
    // same amount of time and cannot be told apart from the outside.
    const matches = user
      ? verifyPassword(password, user.password_hash)
      : verifyPassword(password, "0".repeat(32) + ":" + "0".repeat(128));

    if (!user || !matches) {
      return NextResponse.json(
        { error: "That username and password do not match." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(
      { userId: user.id, username: user.username },
      secret
    );
    const response = NextResponse.json({ username: user.username });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    // Readable by the client so the UI can show the name without the layout
    // having to read cookies on the server. Carries no authority.
    response.cookies.set(USER_COOKIE, encodeURIComponent(user.username), {
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
