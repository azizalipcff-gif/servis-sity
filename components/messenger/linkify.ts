/**
 * Framework-free message-text helpers shared by the messenger UI and the
 * node test-suite (no React / next-intl / "@/" imports on purpose).
 */

const URL_RE = /(https?:\/\/[^\s<>]+)/g;

export type TextSegment = { kind: "text" | "link"; value: string };

/** Split a message body into plain-text and URL segments for safe rendering. */
export function linkifySegments(body: string): TextSegment[] {
  const out: TextSegment[] = [];
  let last = 0;
  for (const m of body.matchAll(URL_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: "text", value: body.slice(last, idx) });
    out.push({ kind: "link", value: m[0] });
    last = idx + m[0].length;
  }
  if (last < body.length) out.push({ kind: "text", value: body.slice(last) });
  return out.length ? out : [{ kind: "text", value: body }];
}

/**
 * Only http(s) URLs may become clickable links or attachment hrefs. Anything
 * else (javascript:, data:, protocol-relative, garbage) renders as inert
 * text — defense in depth against stored XSS via direct DB inserts, which
 * RLS does not constrain.
 */
export function safeHref(url: string): string {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}
