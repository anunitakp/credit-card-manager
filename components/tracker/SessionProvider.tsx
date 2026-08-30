"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { USER_COOKIE } from "@/lib/session";

/**
 * The signed-in account's display name.
 *
 * Read from a readable cookie on the client rather than from the session on
 * the server. Reading the session in the root layout meant calling
 * `cookies()`, and that opts the whole route tree out of static rendering —
 * every navigation became a server render just to print a name.
 *
 * There is no flash of a missing name despite this being client-side: every
 * page shows a skeleton until its data loads, and the cookie is read long
 * before that finishes.
 *
 * This name grants nothing. Authorisation is the httpOnly session cookie,
 * checked in middleware and again in every route handler.
 */
export interface SessionUser {
  username: string;
}

const SessionContext = createContext<SessionUser | null>(null);

function readUsername(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${USER_COOKIE}=([^;]*)`)
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]) || null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  // In an effect, not during render: the server render has no cookies, so
  // reading during render would produce a hydration mismatch.
  useEffect(() => {
    const username = readUsername();
    setUser(username ? { username } : null);
  }, []);

  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** The signed-in account, or null before it is known / when signed out. */
export function useSession(): SessionUser | null {
  return useContext(SessionContext);
}
