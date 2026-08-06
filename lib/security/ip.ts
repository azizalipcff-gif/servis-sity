import type { NextRequest } from "next/server";

/**
 * Best-effort client IP extraction for rate limiting / audit.
 * Values come from trusted proxy headers. In production behind a reverse
 * proxy this is the first hop address.
 */
export function getClientIp(request: Request | NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first && first.length > 0) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}