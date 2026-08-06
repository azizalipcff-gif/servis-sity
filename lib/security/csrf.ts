/**
 * Same-origin / CSRF guard for mutating requests.
 *
 * Defense in depth: the session cookie is HttpOnly + SameSite=Lax, which
 * already stops the common cross-site POST flows. This origin check adds a
 * server-side assertion so forged payloads are rejected before touching data.
 */

export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (origin) {
    if (!host) return false;
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // Browsers always send sec-fetch-site on cross-origin navigations/requests.
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "none";
  }

  // No Origin + no Sec-Fetch-Site => non-browser client (CLI, server, tests).
  return true;
}