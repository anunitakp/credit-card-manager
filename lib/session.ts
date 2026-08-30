/**
 * Session tokens.
 *
 * A signed, self-contained token — `base64url(payload).base64url(HMAC)` — so
 * verifying a request needs nothing but the secret. There is no session table
 * to keep, which matters because the middleware that guards every route runs
 * on the Edge runtime and cannot reach the database.
 *
 * Everything here uses Web Crypto rather than `node:crypto` for that same
 * reason: this module has to work unchanged in middleware, in route handlers
 * and in server components.
 */

export const SESSION_COOKIE = "et_session";

/**
 * A second, deliberately readable cookie holding only the display name.
 *
 * The session cookie is httpOnly, so the client cannot read the username out
 * of it. Reading it on the server instead meant the root layout called
 * `cookies()`, which opts the entire route tree out of static rendering —
 * every page became a server render per navigation just to print a name.
 * This carries no authority whatsoever; it is a label, and the httpOnly
 * cookie remains the only thing that authorises anything.
 */
export const USER_COOKIE = "et_user";

/** Thirty days. Long-lived on purpose: this is a personal app on a phone. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padding = value.length % 4 === 0 ? 0 : 4 - (value.length % 4);
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padding);
  const binary = atob(base64);
  // Backed by a plain ArrayBuffer so it satisfies BufferSource — a Uint8Array
  // over ArrayBufferLike could be a SharedArrayBuffer, which Web Crypto rejects.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export interface Session {
  userId: string;
  username: string;
}

export async function createSessionToken(
  session: Session,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<string> {
  const payload = JSON.stringify({
    // The id is what every query scopes by; the name is only ever displayed.
    id: session.userId,
    u: session.username,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
  const body = base64UrlEncode(encoder.encode(payload));
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(body))
  );
  return `${body}.${base64UrlEncode(signature)}`;
}

/**
 * Returns the session a token carries, or null if the signature does not
 * match, the token is malformed, or it has expired. Never throws — callers
 * treat any failure as "not signed in".
 */
export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined
): Promise<Session | null> {
  if (!token || !secret) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      base64UrlDecode(signature),
      encoder.encode(body)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
    if (
      typeof payload?.id !== "string" ||
      typeof payload?.u !== "string" ||
      typeof payload?.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp * 1000 <= Date.now()) return null;

    return { userId: payload.id, username: payload.u };
  } catch {
    return null;
  }
}
