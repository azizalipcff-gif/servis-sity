import type { NextRequest } from "next/server";

/**
 * Best-effort client IP extraction for rate limiting / audit.
 *
 * Trust hierarchy (most → least trustworthy):
 *  1. `x-vercel-forwarded-for` — set by Vercel's trusted edge to the socket
 *     peer. Never client-controlled.
 *  2. `x-real-ip` — set by a trusted reverse proxy (e.g. nginx, Cloudflare) to
 *     the real client address.
 *  3. `x-forwarded-for` — ONLY its rightmost entry is used, because a trusted
 *     proxy appends the real peer on the RIGHT while an attacker can only spoof
 *     entries on the LEFT. This is a last resort for self-hosted deploys behind
 *     a trusted proxy; it is NOT safe when the app is exposed directly to
 *     clients (the entire header is then attacker-controlled).
 *  4. Fallback `"unknown"` — shares a single bucket, which safely limits all
 *     unidentified clients together and prevents trivial IP rotation bypasses.
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

  const real = request.headers.get("x-real-ip");
  if (isPlausibleIp(real)) return real;

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const tokens = xff.split(",").map((t) => t.trim()).filter(Boolean);
    const rightmost = tokens[tokens.length - 1];
    if (isPlausibleIp(rightmost)) return rightmost;
  }

  return "unknown";
}