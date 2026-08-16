/**
 * Pure subscription-state derivation. Kept free of Supabase/Next imports so
 * it can be unit-tested with the zero-dependency node runner and reused by
 * any server route. The database row is the single source of truth — callers
 * must NEVER derive subscription state from client-only data.
 */

export type SubscriptionState =
  | "none" // no subscription row exists
  | "active" // paid, in period, not cancelled/paused
  | "trialing" // status = trialing (trial_end_at set)
  | "paused" // status = paused / paused_at set
  | "cancelling" // cancel_at scheduled in the future, still entitled
  | "cancelled" // cancelled_at set or cancel_at already passed
  | "expired" // expires_at passed with no renewal
  | "superseded" // replaced by a newer subscription
  | "free"; // explicit free status row (plan = free)

export type SubscriptionLike = {
  status?: string | null;
  plan?: string | null;
  plan_key?: string | null;
  lifetime?: boolean | null;
  paused_at?: string | null;
  cancel_at?: string | null;
  cancelled_at?: string | null;
  trial_end_at?: string | null;
  expires_at?: string | null;
  next_billing_at?: string | null;
};

export function deriveSubscriptionState(
  sub: SubscriptionLike | null | undefined,
  now: Date = new Date(),
): SubscriptionState {
  if (!sub) return "none";

  const status = sub.status?.trim().toLowerCase() ?? "";

  // Explicit terminal / special statuses first.
  if (status === "superseded") return "superseded";
  if (status === "expired") return "expired";
  if (status === "cancelled") return "cancelled";
  if (status === "free") return "free";
  if (status === "trialing") return "trialing";
  if (status === "paused" || (sub.paused_at && status !== "active")) return "paused";

  // Cancellation fields override a still-"active" label.
  if (sub.cancelled_at) return "cancelled";

  const cancelAt = parseDate(sub.cancel_at);
  if (cancelAt && cancelAt <= now) return "cancelled";
  if (cancelAt && cancelAt > now) return "cancelling";

  // Lifetime plans never expire.
  if (sub.lifetime) return "active";

  // Expiry: paid period is over and nothing keeps it alive.
  const expiresAt = parseDate(sub.expires_at);
  if (expiresAt && expiresAt <= now) {
    const nextBilling = parseDate(sub.next_billing_at);
    if (!nextBilling || nextBilling <= now) return "expired";
  }

  return "active";
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whether a subscription is currently granting entitlements. */
export function isEntitled(state: SubscriptionState): boolean {
  return state === "active" || state === "trialing" || state === "cancelling";
}
