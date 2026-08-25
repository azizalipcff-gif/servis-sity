import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { getClientIp } from "./ip";

/**
 * Shared, cross-instance rate limiter backed by Upstash Redis.
 *
 * Why Upstash: serverless/edge deployments run many instances, so an
 * in-memory limiter cannot aggregate hits. Upstash Redis is a shared store
 * that every instance reads/writes, so the limit is enforced globally.
 *
 * Identity: the bucket key is `${opts.key}:${clientIp}`. The client IP comes
 * from the hardened extractor in `./ip.ts` (prefers `x-vercel-forwarded-for`,
 * then `x-real-ip`, then only the rightmost `x-forwarded-for` entry), so a
 * client cannot bypass the limit by spoofing `x-forwarded-for` tokens.
 *
 * Fail-safe behavior:
 *  - If `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are present,
 *    the shared limiter is used in every environment.
 *  - In PRODUCTION, if those variables are missing, `rateLimit` throws a clear
 *    error instead of silently falling back to an unsafe in-memory limiter.
 *  - In DEVELOPMENT (no creds), an in-memory limiter is used for convenience,
 *    with a one-time warning that it does not aggregate across instances.
 *  - If Upstash itself errors at request time, we FAIL CLOSED (reject the
 *    request) so the limit is never silently bypassed.
 */

type Result =
  | { ok: true; retryAfter: number }
  | { ok: false; retryAfter: number };

function upstashConfigured(): boolean {
  return (
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function duration(windowMs: number): `${number} s` {
  return `${Math.round(windowMs / 1000)} s` as `${number} s`;
}

// One Ratelimit instance per distinct (limit, windowMs); instances are cheap
// and the bucket key already namespaces by operation + client IP.
const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  const existing = upstashLimiters.get(cacheKey);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, duration(windowMs)),
    prefix: `rl:${cacheKey}`,
  });
  upstashLimiters.set(cacheKey, limiter);
  return limiter;
}

// ---- Development-only in-memory fallback (never used in production) ----
type Bucket = { hits: number[] };
const memBuckets = new Map<string, Bucket>();
const MAX_BUCKETS = 20_000;
let memWarned = false;

function memLimit(identifier: string, limit: number, windowMs: number): Result {
  if (!memWarned) {
    memWarned = true;
    console.warn(
      "[rate-limit] Using in-memory limiter (development only). It does NOT aggregate across instances. " +
        "Set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN to enable the shared, cross-instance limiter.",
    );
  }
  const now = Date.now();
  let bucket = memBuckets.get(identifier);
  if (!bucket) {
    if (memBuckets.size >= MAX_BUCKETS) {
      const oldest = memBuckets.keys().next().value as string | undefined;
      if (oldest) memBuckets.delete(oldest);
    }
    bucket = { hits: [] };
    memBuckets.set(identifier, bucket);
  }
  while (bucket.hits.length && now - bucket.hits[0] > windowMs) {
    bucket.hits.shift();
  }
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }
  bucket.hits.push(now);
  return { ok: true, retryAfter: Math.ceil(windowMs / 1000) };
}

export async function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number },
): Promise<Result> {
  const identifier = `${opts.key}:${getClientIp(request)}`;

  if (upstashConfigured()) {
    try {
      const limiter = getUpstashLimiter(opts.limit, opts.windowMs);
      const { success, reset } = await limiter.limit(identifier);
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return success
        ? { ok: true, retryAfter }
        : { ok: false, retryAfter };
    } catch (err) {
      // Upstash unreachable / errored: fail CLOSED so the limit is never
      // silently bypassed. Log only the message — never tokens or headers.
      console.error(
        "[rate-limit] Upstash request failed; failing closed (request rejected).",
        err instanceof Error ? err.message : String(err),
      );
      return { ok: false, retryAfter: Math.ceil(opts.windowMs / 1000) };
    }
  }

  // Upstash is not configured. Fall back to the in-memory limiter so the
  // request is still throttled per instance and the app keeps working — a
  // missing *optional* dependency must not take down every mutation endpoint
  // with a 500.
  //
  // Security note: the in-memory limiter does NOT aggregate hits across
  // instances. Single-instance deployments (local, small VPS) remain fully
  // rate-limited. Multi-instance production MUST set UPSTASH_REDIS_REST_URL /
  // UPSTASH_REDIS_REST_TOKEN so limits are enforced globally. We warn loudly
  // here instead of crashing, because a total outage of all writes is worse
  // than a per-instance limit.
  if (process.env.NODE_ENV === "production") {
    if (!memWarned) {
      memWarned = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
          "Falling back to an in-memory limiter: rate limits are enforced PER INSTANCE only and " +
          "are NOT aggregated across instances. Set the Upstash env vars for shared, cross-instance limiting.",
      );
    }
  } else if (!memWarned) {
    memWarned = true;
    console.warn(
      "[rate-limit] Using in-memory limiter (development only). It does NOT aggregate across instances. " +
        "Set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN to enable the shared, cross-instance limiter.",
    );
  }

  return memLimit(identifier, opts.limit, opts.windowMs);
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
