import type { NextRequest } from "next/server";

/**
 * Best-effort client IP extraction for rate limiting / audit.
 *
 * Trust model: the header an attacker can spoof sits on the LEFT of
 * `x-forwarded-for`; proxies append the true peer IP on the RIGHT. We therefore
 * walk from the rightmost entry and return the first token that looks like an
 * IP. On Vercel the edge runtime sets `x-vercel-forwarded-for` to the socket
 * peer address, which we prefer first.
 */
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_RE = /^[0-9a-fA-F:.%]+$/;

function isPlausibleIp(value: string | null | undefined): value is string {
  if (!value) return false;
  const v4 = value.match(IPV4_RE);
  if (v4) {
    return v4.slice(1).every((octet) => Number(octet) >= 0 && Number(octet) <= 255);
  }
  return value.includes(":") && IPV6_RE.test(value);
}

export function getClientIp(request: Request | NextRequest): string {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (isPlausibleIp(vercelForwarded)) return vercelForwarded;

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const tokens = xff.split(",").map((t) => t.trim()).filter(Boolean);
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (isPlausibleIp(tokens[i])) return tokens[i];
    }
    // All tokens were junk — fall through to the remaining sources.
  }

  const real = request.headers.get("x-real-ip");
  if (isPlausibleIp(real)) return real;

  return "unknown";
}