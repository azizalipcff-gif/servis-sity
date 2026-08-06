import { NextResponse } from "next/server";
import { getClientIp } from "./ip";

/**
 * In-memory sliding-window rate limiter (single-instance deployments).
 * For multi-instance production, swap the backing store for Redis/Postgres;
 * the public contract stays the same.
 */

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 20_000;

type Result =
  | { ok: true; retryAfter: number }
  | { ok: false; retryAfter: number };

function evictIfNeeded(): void {
  if (buckets.size < MAX_BUCKETS) return;
  // Evict the oldest inserted bucket to bound memory.
  const oldest = buckets.keys().next().value;
  if (oldest) buckets.delete(oldest);
}

export function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number },
): Result {
  const key = `${opts.key}:${getClientIp(request)}`;
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    evictIfNeeded();
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  // Drop expired entries.
  while (bucket.hits.length && now - bucket.hits[0] > opts.windowMs) {
    bucket.hits.shift();
  }

  if (bucket.hits.length >= opts.limit) {
    const oldest = bucket.hits[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }

  bucket.hits.push(now);
  return { ok: true, retryAfter: opts.windowMs / 1000 };
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "too_many_requests" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}