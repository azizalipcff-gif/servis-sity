/**
 * Input sanitization & output encoding guards.
 * Browser-side React already escapes rendered text; these helpers protect the
 * remaining raw insertion points (JSON-LD) and normalize untrusted strings
 * before they are persisted.
 */

/** Strip control characters except whitespace/newline, trim, cap length. */
export function sanitizeText(input: string, max = 5000): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, max);
}

/**
 * JSON-LD is injected with dangerouslySetInnerHTML; neutralize `</script`
 * sequences so a hostile business name/description can't break out of the
 * <script> element. Escaping also produces valid JSON.
 */
export function toJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
}

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // Only allow http(s) URLs.
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return trimmed;
  } catch {
    return "";
  }
}