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
 * Server-only client that bypasses RLS (service role). Used exclusively by
 * gateway webhook handlers, which must record provider-confirmed payment state
 * without a user session. Never call this from user-facing routes — mutations
 * there must stay on the session client so RLS still applies.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isValidHttpUrl(url) || !key) return null;
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
