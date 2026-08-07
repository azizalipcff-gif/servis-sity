import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isValidHttpUrl, isValidSupabaseKey } from "./lib/supabase/validate";

const handleI18nRouting = createMiddleware(routing);

const ADMIN_SEGMENT = "admin";

function isAdminPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  if (segments[0] === ADMIN_SEGMENT) return true;
  if (
    segments.length >= 2 &&
    (routing.locales as readonly string[]).includes(segments[0]) &&
    segments[1] === ADMIN_SEGMENT
  ) {
    return true;
  }
  return false;
}

export default async function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);

  const { pathname } = request.nextUrl;
  const isAdmin = isAdminPath(pathname);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasCredentials = isValidHttpUrl(url) && isValidSupabaseKey(anonKey);

  if (hasCredentials) {
    const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure:
                  options.secure ??
                  process.env.NODE_ENV === "production",
              }),
            );
          },
        },
        },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Edge-level auth gate for the admin area. The authoritative admin-role
    // check happens server-side in the admin layout + every admin API route.
    if (isAdmin && !user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${segmentsPrefix(pathname)}`;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

function segmentsPrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  return (routing.locales as readonly string[]).includes(segments[0] ?? "")
    ? segments[0]
    : "";
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};