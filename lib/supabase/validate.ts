/**
 * Supabase SSR client requires a well-formed http(s) URL (and a non-empty key).
 * `createServerClient` throws a synchronous
 * `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.` for any non-empty
 * malformed value — so a bad env var crashes the middleware / server client on
 * every request. These helpers guard against that so the app degrades to the
 * documented "render before credentials are set" behaviour instead of 500-ing
 * the whole site.
 */

export function isValidHttpUrl(value: string | undefined | null): value is string {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidSupabaseKey(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}