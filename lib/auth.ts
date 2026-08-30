import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Accounts and password hashing.
 *
 * Node-only (scrypt), so this module must never be imported from middleware,
 * which runs on the Edge runtime. Only the sign-in and sign-up routes need
 * it — every other request is authorised from the signed session cookie.
 *
 * Plaintext passwords are never stored, logged, or returned: the database
 * holds a scrypt hash in `salt:hash` form and nothing else.
 */

const KEY_LENGTH = 64;

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

/**
 * Constant-time check against a stored `salt:hash`. Comparing with `===`
 * would leak how much of the hash matched through how long it took.
 */
export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;

  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;

  let expectedBuffer: Buffer;
  try {
    expectedBuffer = Buffer.from(expected, "hex");
  } catch {
    return false;
  }
  if (expectedBuffer.length !== KEY_LENGTH) return false;

  return timingSafeEqual(scryptSync(password, salt, KEY_LENGTH), expectedBuffer);
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Missing AUTH_SECRET in your environment. See the Accounts section of the README."
    );
  }
  return secret;
}


export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
}

export async function findUserByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<UserRow | null> {
  // Matching on lower(username) mirrors the unique index, so sign-in is
  // case-insensitive in exactly the way registration is.
  const { data, error } = await supabase
    .from("users")
    .select("id, username, password_hash")
    .ilike("username", username)
    .maybeSingle();

  if (error) throw error;
  return (data as UserRow) ?? null;
}

export async function countUsers(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/**
 * Hands every ownerless row to a user.
 *
 * Called once, for the first account ever created. Rows predating multi-user
 * support have a NULL user_id; this is what turns the data already in the
 * database into that account's data, rather than leaving it stranded.
 */
export async function claimOrphanedData(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  for (const table of ["billing_cycles", "upi_expenses", "budgets", "trips", "notes"]) {
    const { error } = await supabase
      .from(table)
      .update({ user_id: userId })
      .is("user_id", null);
    if (error) throw error;
  }
}
