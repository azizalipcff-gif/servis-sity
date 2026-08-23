import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { isValidHttpUrl, isValidSupabaseKey } from "./validate";

export async function createClient() {
  const cookieStore = await cookies();

  // createServerClient throws synchronously for a malformed (non-empty) URL,
  // which crashes every page render. Fall back to a throwaway URL so the
  // defensive query helpers degrade to empty results instead of 500-ing.
  const url = isValidHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : "https://unset.supabase.co";
  const anonKey = isValidSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : "unset";

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: options.httpOnly ?? true,
                sameSite: options.sameSite ?? "lax",
                secure: options.secure ?? process.env.NODE_ENV === "production",
              }),
            );
          } catch {
            // Called from a Server Component — safe to ignore when the
            // session cookie cannot be written here.
          }
        },
      },
    },
  );
}

/**
 * Server-only client that bypasses RLS (service role). Used by gateway webhook
 * handlers (record provider-confirmed payment state without a user session)
 * and by bounded, fully-validated event-ingestion writers: /api/analytics/track,
 * /api/log, lib/security/logger and the bookings analytics side-effect. Those
 * writers must not depend on anon RLS INSERT grants, because `analytics_events`
 * and `system_logs` intentionally carry none (migration 0032).
 *
 * Never call this from general user-facing mutations — those must stay on the
 * session client so RLS still applies.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isValidHttpUrl(url) || !key) return null;
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Cookies-free public Supabase client (anon key, no session/cookie access).
 *
 * Used by read-heavy public query helpers that are wrapped in `unstable_cache`.
 * `unstable_cache` forbids touching request-specific APIs such as `cookies()`,
 * so a server client built via `@supabase/ssr` (which always reads cookies)
 * cannot be used inside it. The anon key still respects RLS, so public read
 * policies apply exactly as before — only the user session is no longer
 * attached (these helpers only ever fetch approved/published public data).
 */
export function createPublicClient() {
  const url = isValidHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : "https://unset.supabase.co";
  const anonKey = isValidSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : "unset";
  return createSupabaseClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  });
}
