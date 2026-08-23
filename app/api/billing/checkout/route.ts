import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { getPlan } from "@/lib/billing/plans";
import { applyCoupon } from "@/lib/billing/coupons";
import { findActiveSubscriptionId } from "@/lib/billing/subscription";
import { computeTotals, recordPayment, recordAttempt } from "@/lib/payments/service";
import { resolveProvider } from "@/lib/payments/provider";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorCapture("billing.checkout", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const limited = await rateLimit(req, { key: "billing.checkout", limit: 20, windowMs: 60000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfter);

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    // Payment rows are a SERVER-controlled snapshot (amount, plan metadata,
    // provider reference). They are created with the service client so no
    // RLS path lets a user author an arbitrary payment to present to an admin
    // for confirmation. The service role key is a required deploy credential.
    const server = createServiceClient();
    if (!server) return jsonError(500, "service_role_unconfigured");

    const body = (await req.json().catch(() => ({}))) as {
      planCode?: string;
      interval?: "monthly" | "quarterly" | "yearly" | "lifetime";
      businessId?: string;
      couponCode?: string;
    };
    if (!body.planCode || !body.interval || !body.businessId) {
      return jsonError(400, "bad_request");
    }

    // Ownership
    const { data: owner } = await supabase
      .from("businesses")
      .select("id,owner_id,name")
      .eq("id", body.businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!owner) return jsonError(403, "forbidden");

    const plan = await getPlan(body.planCode, body.interval);
    if (!plan) return jsonError(400, "plan_invalid");
    if (plan.price_cents <= 0) return jsonError(400, "plan_free");

    // Reject a duplicate purchase while the business is already entitled to a
    // paid plan. Prevents accidental double-payment from repeated clicks.
    const activeSubId = await findActiveSubscriptionId(supabase, body.businessId);
    if (activeSubId) return jsonError(409, "already_subscribed");

    const subtotal = plan.price_cents;
    let discount = 0;
    let couponId: string | null = null;
    const couponCode = (body.couponCode ?? "").trim();
    if (couponCode) {
      try {
        const coupon = await applyCoupon(couponCode, user.id, body.planCode, subtotal);
        discount = coupon.discountCents;
        couponId = coupon.couponId;
      } catch (e) {
        return jsonError(400, String(e instanceof Error ? e.message : "coupon_invalid"));
      }
    }

    const totals = computeTotals(subtotal, discount, plan.currency);
    const provider = resolveProvider();
    const idempotencyKey = randomUUID();

    const payment = await recordPayment(server, {
      userId: user.id,
      businessId: body.businessId,
      subscriptionId: null,
      provider: provider.code,
      amountCents: subtotal,
      currency: plan.currency,
      status: "pending",
      idempotencyKey,
      metadata: {
        planCode: body.planCode,
        interval: body.interval,
        planName: plan.name,
        businessId: body.businessId,
        discountCents: discount,
        couponId: couponId ?? null,
        taxRate: totals.taxRate,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        lifetime: body.interval === "lifetime",
      },
    });

    const returnUrl = `${siteUrl()}/dashboard/billing?payment=${payment.id}`;
    const cancelUrl = `${siteUrl()}/dashboard/billing`;

    const checkout = await provider.createCheckout({
      planCode: body.planCode,
      interval: body.interval,
      billTitle: `${plan.name} ${body.interval}`,
      amountCents: totals.totalCents,
      currency: plan.currency,
      userId: user.id,
      businessId: body.businessId,
      idempotencyKey,
      returnUrl,
      cancelUrl,
      customerEmail: user.email,
    });

    await server
      .from("payments")
      .update({
        provider_payment_id: checkout.paymentReference,
        gateway_ref: checkout.url,
        status: checkout.manual ? "pending" : "processing",
        payment_method: provider.code,
      })
      .eq("id", payment.id);
    await recordAttempt(supabase, payment.id, provider.code, "processing", {
      response: { reference: checkout.paymentReference, manual: Boolean(checkout.manual) },
    });

    return jsonOk({
      paymentId: payment.id,
      paymentRef: checkout.paymentReference,
      url: checkout.url,
      manual: Boolean(checkout.manual),
      totals,
      couponCode: couponCode || null,
    });
  });
}