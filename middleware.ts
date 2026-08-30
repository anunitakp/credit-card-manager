import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  USER_COOKIE,
  verifySessionToken,
} from "@/lib/session";

/**
 * The single gate in front of the app.
 *
 * Putting it in middleware rather than in each page means a route added later
 * is protected by default — the failure mode is "locked out", not "wide
 * open". The API routes are guarded here too, so the data cannot be read by
 * calling the endpoints directly.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // The login form itself and the endpoints that operate it must stay open,
  // or there would be no way in.
  const isAuthRoute = pathname.startsWith("/api/auth/");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const session = await verifySessionToken(
    req.cookies.get(SESSION_COOKIE)?.value,
    process.env.AUTH_SECRET
  );

  if (isAuthRoute) return NextResponse.next();

  if (isAuthPage) {
    // Already signed in: skip the form.
    if (session) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (session) {
    // Sessions created before the readable name cookie existed have no name
    // to show. Backfill it once rather than making every page render on the
    // server just to read the httpOnly cookie.
    if (req.cookies.get(USER_COOKIE)?.value !== encodeURIComponent(session.username)) {
      const response = NextResponse.next();
      response.cookies.set(USER_COOKIE, encodeURIComponent(session.username), {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
      });
      return response;
    }
    return NextResponse.next();
  }

  // An expired session on a background fetch should surface as a clean 401
  // the client can react to, not as a redirect to an HTML login page that
  // then fails to parse as JSON.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  /**
   * Everything except Next's own assets and the files a browser or launcher
   * fetches before there is any chance to sign in — the manifest and the
   * home-screen icons, which must stay reachable for the app to install.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-|apple-touch-icon).*)",
  ],
};
