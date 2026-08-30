import { NextResponse } from "next/server";
import { SESSION_COOKIE, USER_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Same attributes as when they were set, or the browser keeps the old ones.
  for (const [name, httpOnly] of [
    [SESSION_COOKIE, true],
    [USER_COOKIE, false],
  ] as const) {
    response.cookies.set(name, "", {
      httpOnly,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
