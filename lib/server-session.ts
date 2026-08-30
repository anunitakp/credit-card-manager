import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, type Session, verifySessionToken } from "./session";

/**
 * Reads the signed session cookie inside a server component or route handler.
 *
 * Middleware already turns anonymous requests away, so in practice this
 * always finds a session on a protected route. It is still checked here
 * rather than assumed: a route that forgets to scope its query is a data
 * leak, and `requireUser` is what makes that impossible to forget — there is
 * no way to get a user id without it.
 */
export async function getSession(): Promise<Session | null> {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in.");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Maps an UnauthorizedError to a 401, or returns null for other errors. */
export function unauthorizedResponse(err: unknown): NextResponse | null {
  return err instanceof UnauthorizedError
    ? NextResponse.json({ error: err.message }, { status: 401 })
    : null;
}
