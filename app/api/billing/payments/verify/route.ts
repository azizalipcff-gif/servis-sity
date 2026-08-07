import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { resolveProvider } from "@/lib/payments/provider";
import { finalizeSuccessfulPayment } from "@/lib/payments/service";
import { notifyUser } from "@/lib/notifications";
import type { PlanType } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorCapture("billing.payments.verify", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as { paymentId?: string };
    if (!body.paymentId) return jsonError(400, "bad_request");

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("id", body.paymentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!payment) return jsonError(404, "not_found");
    if (payment.status === "succeeded") return jsonOk({ status: "succeeded" });

    const provider = resolveProvider(payment.provider);
    const meta = (payment.metadata ?? {}) as Record<string, unknown>;

    // Manual gateway stays pending until an admin confirms the transfer.
    if (provider.code === "manual" || payment.status === "pending") {
      return jsonOk({ status: payment.status });
    }

    const verification = await provider.verifyPayment(payment.provider_payment_id ?? "");
    if (verification.status !== "succeeded") {
      await supabase
        .from("payments")
        .update({ status: verification.status, failure_reason: null })
        .eq("id", payment.id);
      return jsonOk({ status: verification.status });
    }

    await finalizeSuccessfulPayment(supabase, {
      userId: user.id,
      businessId: String(meta.businessId),
      paymentId: payment.id,
      planCode: meta.planCode as PlanType,
      intervalType: String(meta.interval),
      planName: String(meta.planName),
      amountCents: payment.amount_cents,
      currency: payment.currency,
      discountCents: Number(meta.discountCents ?? 0),
      taxRate: Number(meta.taxRate ?? 0),
      taxCents: Number(meta.taxCents ?? 0),
      totalCents: Number(meta.totalCents ?? payment.amount_cents),
      lifetime: Boolean(meta.lifetime),
      couponId: meta.couponId ? String(meta.couponId) : null,
    });

    await notifyUser({
      recipientId: user.id,
      type: "payment",
      category: "payment",
      title: "Payment successful",
      body: `Your ${String(meta.planName)} subscription is now active.`,
      link: "/billing",
    });

    return jsonOk({ status: "succeeded" });
  });
}