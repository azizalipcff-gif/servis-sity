import { safeReturnTo } from "./return-to.ts";

export interface OAuthRedirectOptions {
  /** Active locale so the post-login redirect lands in the same locale. */
  locale: string;
  /** Internal path to return to after login (e.g. "/dashboard"). */
  returnTo?: string;
  /**
   * Origin the callback should run on. In the browser this defaults to
   * `window.location.origin`, which makes the redirect environment-aware:
   * `http://localhost:3000` in development and the deployed domain in
   * production. Never hardcode an origin here — the whole point is to follow
   * whatever origin the app is actually being served from, so a dev session
   * never gets bounced to production (and vice-versa).
   *
   * `origin` is injected by tests; in the browser it is resolved automatically.
   */
  origin?: string;
}

/**
 * Absolute OAuth callback URL handed to `supabase.auth.signInWithOAuth`.
 *
 * Environment-aware by construction:
 *   • development  → http://localhost:3000/auth/callback?next=...
 *   • production   → https://<deployed-domain>/auth/callback?next=...
 *
 * The `next` value is the locale-prefixed, open-redirect-safe return path.
 */
export function getOAuthRedirectUrl({
  locale,
  returnTo,
  origin,
}: OAuthRedirectOptions): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) {
    throw new Error(
      "getOAuthRedirectUrl: could not resolve an origin (pass `origin` explicitly in non-browser contexts)",
    );
  }
  const safe = safeReturnTo(returnTo) ?? "/dashboard";
  const nextPath = `/${locale}${safe}`;
  return `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
