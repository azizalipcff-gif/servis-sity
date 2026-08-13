const LOCALES = ["ar", "fr", "en"] as const;

/**
 * Safe internal redirect target.
 *
 * Only absolute, single-slash internal paths are accepted. Everything else
 * (protocol-relative `//host`, `javascript:`, backslashes, control
 * characters, ...) is rejected so a `returnTo` / `next` query value can never
 * escalate into an open redirect.
 */
export function safeReturnTo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.includes(":") || v.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(v)) return null;
  return v;
}

/**
 * Strips a leading `/<locale>/` prefix (when present) so the redirect target
 * is locale-relative and the current locale is applied exactly once during the
 * post-login redirect.
 */
export function stripLocalePrefix(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (
    segments.length >= 2 &&
    (LOCALES as readonly string[]).includes(segments[0])
  ) {
    return `/${segments.slice(1).join("/")}`;
  }
  return path;
}