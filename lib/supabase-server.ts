import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, using the service role key.
 *
 * This must never be imported from client components — it is only used
 * inside API route handlers (app/api/**), which run on the server. The
 * service role key is read from a non-NEXT_PUBLIC env var, so it is never
 * bundled into client-side JavaScript.
 */
let client: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
        "Copy .env.local.example to .env.local and fill in your Supabase project's " +
        "URL and service_role key."
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return client;
}
