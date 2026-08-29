/**
 * Extracts a human-readable message from anything that might be thrown or
 * returned as an error — a real Error, a Supabase/PostgREST error object
 * (which has a `.message` but is NOT an `instanceof Error`), or something
 * unexpected.
 */
export function toErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}
