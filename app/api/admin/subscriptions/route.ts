import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { writeAudit } from "@/lib/security/audit";
import { recordPayment, finalizeSuccessfulPayment } from "@/lib/payments/service";
import { subscriptionGrantSchema } from "@/lib/validations/admin-schemas";

export const dynamic = "force-dynamic";

const TAX_RATE = 0.2;

export async function GET() {
  return withErrorCapture("admin.subscriptions.get", async () => {
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { supabase } = auth;

    const [{ data: businesses }, { data: plans }] = await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, plan, owner_id")
        .order("name", { ascending: true })
        .limit(300),
      supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("interval", { ascending: true }),
    ]);

    return jsonOk({ businesses: businesses ?? [], plans: plans ?? [] });
  });
}

export async function POST(req: NextRequest) {
  return withErrorCapture("admin.subscriptions.post", async () => {
    const rl = await rateLimit(req, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(403, "forbidden");
    const { supabase } = guard;

    const body = await req.json().catch(() => null);
    const parsed = subscriptionGrantSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");
    const { business_id, plan_key, interval, mode, amount_cents, currency, method, reference, note, coupon_id } =
      parsed.data;

    const { data: business } = await supabase
      .from("businesses")
      .select("id, owner_id, name")
      .eq("id", business_id)
      .maybeSingle();
    if (!business) return jsonError(404, "business_not_found");
    if (!business.owner_id) return jsonError(400, "business_has_no_owner");

    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("plan_key", plan_key)
      .eq("interval", interval)
      .maybeSingle();
    if (!plan) return jsonError(400, "plan_invalid");

    const amountCents =
      mode === "manual_billing" && typeof amount_cents === "number" ? amount_cents : plan.price_cents;
    const cur = currency ?? plan.currency ?? "MAD";
    const taxCents = Math.round(amountCents * TAX_RATE);
    const totalCents = amountCents + taxCents;

    // Record a MANUAL payment (provider = 'manual'); never pretend this came
    // from Stripe/CMI. The ledger + subscription are derived server-side.
    const payment = await recordPayment(supabase, {
      userId: business.owner_id,
      businessId: business.id,
      subscriptionId: null,
      provider: "manual",
      amountCents: totalCents,
      currency: cur,
      status: "succeeded",
      idempotencyKey: `manual-grant-${randomUUID()}`,
      metadata: {
        planCode: plan_key,
        interval,
        planName: plan.name,
        manual: true,
        mode,
        method: method ?? null,
        reference: reference ?? null,
        note: note ?? null,
      },
    });
    if (!payment) return jsonError(500, "payment_record_failed");

    // Supersede any currently-active subscription for this business so a manual
    // grant does not create a duplicate. Provider fields are preserved.
    await supabase
      .from("subscriptions")
      .update({ status: "canceled", cancelled_at: new Date().toISOString() })
      .eq("business_id", business.id)
      .eq("status", "active");

    await finalizeSuccessfulPayment(supabase, {
      userId: business.owner_id,
      businessId: business.id,
      paymentId: payment.id,
      planCode: plan_key,
      intervalType: interval,
      planName: plan.name,
      amountCents,
      currency: cur,
      discountCents: 0,
      taxRate: TAX_RATE,
      taxCents,
      totalCents,
      lifetime: interval === "lifetime",
      couponId: coupon_id ?? null,
    });

    await writeAudit({
      actorId: guard.admin.id,
      action: "subscription.manual_activate",
      targetType: "business",
      targetId: business.id,
      metadata: {
        plan_key,
        interval,
        mode,
        amount_cents: totalCents,
        currency: cur,
        payment_id: payment.id,
        method: method ?? null,
      },
    });

    return jsonOk({ ok: true });
  });
}
