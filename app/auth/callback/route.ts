import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import { safeReturnTo, stripLocalePrefix } from "@/lib/auth/return-to";

const LOCALES = ["ar", "fr", "en"] as const;
type Locale = (typeof LOCALES)[number];

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const recovery = searchParams.get("type") === "recovery";

  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("NEXT_LOCALE")?.value);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignore write errors outside a mutable request scope.
          }
        },
      },
    },
  );

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : { error: { message: "missing_code" } };

  if (error) {
    return NextResponse.redirect(`${origin}/${locale}/login`);
  }

  const safeNext = safeReturnTo(next) ?? sanitizeFallback(next);
  const destination = recovery
    ? `/${locale}/update-password`
    : `/${locale}${stripLocalePrefix(safeNext)}`;

  return NextResponse.redirect(`${origin}${destination}`);
}

function resolveLocale(value: string | undefined): Locale {
  return value && (LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : "ar";
}

function sanitizeFallback(value: string): string {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return `/${value.replace(/^\/+/, "")}`;
}