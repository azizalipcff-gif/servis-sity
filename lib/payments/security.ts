/**
 * Billing security primitives — pure, dependency-free (no Next/Supabase imports)
 * so the providers, routes and the zero-dependency node test runner can all use
 * them, and the security matrix can be executed with plain `node`.
 *
 * Every verification here FAILS CLOSED: a missing secret, a malformed header, a
 * bad signature or a replay outside the clock-tolerance window all throw, so a
 * caller that does not handle them surfaces an opaque 5xx instead of accepting
 * an unverified gateway claim.
 */

/** Terminal payment states that must never be regressed by a user mirror. */
export const TERMINAL_PAYMENT_STATUSES = new Set<string>([
  "succeeded",
  "refunded",
  "partial_refunded",
  "cancelled",
]);

export function isTerminalPaymentStatus(status: string | null | undefined): boolean {
  return status != null && TERMINAL_PAYMENT_STATUSES.has(status);
}

/**
 * Allowed non-admin status moves. The gateway (verify/webhook) may push a
 * non-terminal payment forward (pending → processing → succeeded/failed/...),
 * but a terminal state is an end state: it must never be flipped back by a
 * user-mirror path. A no-op (current === next) is allowed for idempotency.
 */
export function canAdvancePaymentStatus(
  current: string | null | undefined,
  next: string | null | undefined,
): boolean {
  if (current === next) return true;
  if (isTerminalPaymentStatus(current)) return false;
  return next != null;
}

/**
 * A webhook from provider X may only ever touch a payment recorded against
 * provider X. Resolving the provider by URL and then updating a payment that
 * was actually created by a different gateway would let a weaker provider's
 * unsigned webhook upgrade a payment recorded under a stronger gateway.
 */
export function paymentMatchesProvider(
  providerCode: string,
  payment: { provider?: string | null },
): boolean {
  return payment.provider === providerCode;
}

/** Payment snapshot columns. Server-controlled after checkout; admin-only to change. */
export const PAYMENT_SNAPSHOT_COLUMNS = [
  "amount_cents",
  "currency",
  "provider",
  "provider_payment_id",
  "gateway_ref",
  "idempotency_key",
  "user_id",
  "business_id",
  "subscription_id",
  "payment_method",
  "metadata",
] as const;

/* ------------------------------------------------------------------------- */
/* Stripe signature verification (t=...,v1=... HMAC-SHA256 over `${t}.${body}`) */
/* ------------------------------------------------------------------------- */

export type StripeSignature = { t: number; v1: string };

export function parseStripeSignature(header: string): StripeSignature {
  const parts = header.split(",").map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) throw new Error("stripe:webhook:bad_signature");
  const t = Number(tPart.slice(2));
  if (!Number.isFinite(t) || t <= 0) throw new Error("stripe:webhook:bad_signature");
  const v1 = v1Part.slice(3);
  if (!/^[0-9a-f]{64}$/i.test(v1)) throw new Error("stripe:webhook:bad_signature");
  return { t, v1 };
}

export async function hmacSha256Hex(
  secret: string,
  payload: string,
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("crypto_unavailable");
  const encoder = new TextEncoder();
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time hex comparison (length-guarded). */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a Stripe webhook signature. Header is `t=<ts>,v1=<hex>[,v1=...]`, the
 * signed payload is `${t}.${rawBody}` and the signature must be inside the
 * clock-tolerance window (default 5 minutes) to defeat replay. Throws a typed
 * message on every failure (fail closed).
 */
export async function verifyStripeSignature(
  secret: string,
  header: string,
  body: string,
  nowMs: number = Date.now(),
  toleranceMs = 300_000,
): Promise<void> {
  if (!secret) throw new Error("stripe:webhook:no_secret");
  const { t, v1 } = parseStripeSignature(header);
  if (Math.abs(nowMs - t * 1000) > toleranceMs) {
    throw new Error("stripe:webhook:timestamp_out_of_tolerance");
  }
  const expected = await hmacSha256Hex(secret, `${t}.${body}`);
  if (!safeEqualHex(expected, v1)) throw new Error("stripe:webhook:invalid_signature");
}

/* ------------------------------------------------------------------------- */
/* Generic body HMAC signature (CMI / Payzone hosted-gateway webhooks).        */
/* Hosted gateways sign the return parameters (excluding their own signature   */
/* field). We verify an HMAC-SHA256 over those params, canonicalized to a      */
/* deterministic "key=value" list sorted by key; a missing secret or signature */
/* or any mismatch throws (fail closed).                                       */
/* ------------------------------------------------------------------------- */

export function formSignaturePayload(
  body: string,
  excludeFields: readonly string[],
): string {
  const params = new URLSearchParams(body);
  const entries: [string, string][] = [];
  for (const [key, value] of params) {
    if (excludeFields.includes(key)) continue;
    entries.push([key, value]);
  }
  entries.sort((a, b) =>
    a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]),
  );
  return entries.map(([key, value]) => `${key}=${value}`).join("&");
}

export async function verifyFormSignature(
  secret: string,
  body: string,
  providedSignature: string | null | undefined,
  errorPrefix: string,
  excludeFields: readonly string[],
): Promise<void> {
  if (!secret) throw new Error(`${errorPrefix}:webhook:no_secret`);
  if (!providedSignature) throw new Error(`${errorPrefix}:webhook:invalid_signature`);
  const payload = formSignaturePayload(body, excludeFields);
  const expected = await hmacSha256Hex(secret, payload);
  if (!safeEqualHex(expected, providedSignature.trim())) {
    throw new Error(`${errorPrefix}:webhook:invalid_signature`);
  }
}

/**
 * Verifies an HMAC-SHA256 signature over the raw body string. Kept as a
 * building block for raw-body schemes; the hosted gateways use
 * {@link verifyFormSignature} instead.
 */
export async function verifyBodySignature(
  secret: string,
  rawBody: string,
  providedSignature: string | null | undefined,
  errorPrefix: string,
): Promise<void> {
  if (!secret) throw new Error(`${errorPrefix}:webhook:no_secret`);
  if (!providedSignature) throw new Error(`${errorPrefix}:webhook:invalid_signature`);
  const expected = await hmacSha256Hex(secret, rawBody);
  if (!safeEqualHex(expected, providedSignature.trim())) {
    throw new Error(`${errorPrefix}:webhook:invalid_signature`);
  }
}

/* ------------------------------------------------------------------------- */
/* Admin entitlement-grant preconditions (single grant path).                  */
/* ------------------------------------------------------------------------- */

export type AdminConfirmGuard = { ok: true } | { ok: false; code: string };

/**
 * Preconditions an admin must pass before granting entitlements for a payment.
 * - A payment in a terminal/negative state (refunded/cancelled/partial_refunded
 *   — with the single exception of `succeeded`) can never be confirmed.
 * - Online providers must have been gateway-verified as `succeeded` (via the
 *   verify/webhook mirror) before an admin grants a plan. Manual/offline
 *   payments stay `pending` until an admin confirms the bank transfer, so they
 *   are exempt.
 */
export function adminConfirmGuard(payment: {
  status?: string | null;
  provider?: string | null;
}): AdminConfirmGuard {
  if (isTerminalPaymentStatus(payment.status) && payment.status !== "succeeded") {
    return { ok: false, code: "payment_not_confirmable" };
  }
  if (payment.provider !== "manual" && payment.status !== "succeeded") {
    return { ok: false, code: "payment_not_verified" };
  }
  return { ok: true };
}