import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/security/sanitize";

export type AppliedCoupon = {
  couponId: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  discountCents: number;
  period: string;
};

function normalize(code: string): string {
  return sanitizeText(code, 40).trim().toUpperCase();
}

/**
 * Load and validate a coupon for a given user + plan. Throws a typed message
 * on every failure so callers can map it to the UI.
 */
export async function applyCoupon(
  code: string,
  userId: string,
  planCode: string,
  subtotalCents: number,
): Promise<AppliedCoupon> {
  const supabase = await createClient();
  const normalized = normalize(code);
  if (!normalized) throw new Error("coupon_empty");

  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (!coupon) throw new Error("coupon_invalid");

  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    throw new Error("coupon_not_started");
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
    throw new Error("coupon_expired");
  }

  if (coupon.applies_to === "plans") {
    const plans = coupon.plans as unknown;
    if (Array.isArray(plans) && plans.length > 0 && !plans.includes(planCode)) {
      throw new Error("coupon_plan_restricted");
    }
  }

  const { count: globalUsage } = await supabase
    .from("coupon_usage")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", coupon.id);
  if (coupon.max_usage != null && (globalUsage ?? 0) >= coupon.max_usage) {
    throw new Error("coupon_limit_reached");
  }

  const { count: perUser } = await supabase
    .from("coupon_usage")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", coupon.id)
    .eq("user_id", userId);
  if (coupon.per_user_limit != null && (perUser ?? 0) >= coupon.per_user_limit) {
    throw new Error("coupon_limit_reached");
  }

  let discountCents: number;
  if (coupon.type === "percent") {
    discountCents = Math.round((subtotalCents * coupon.value) / 100);
  } else {
    discountCents = Math.round(coupon.value * 100);
  }
  if (coupon.amount_total_cents > 0) {
    discountCents = Math.min(discountCents, coupon.amount_total_cents);
  }
  discountCents = Math.min(discountCents, subtotalCents);

  return {
    couponId: coupon.id,
    code: coupon.code,
    type: coupon.type === "fixed" ? "fixed" : "percent",
    value: coupon.value,
    discountCents,
    period: coupon.period,
  };
}