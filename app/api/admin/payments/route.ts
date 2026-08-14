import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { finalizeSuccessfulPayment } from "@/lib/payments/service";
import { notifyUser } from "@/lib/notifications";
import type { PlanType } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withErrorCapture("admin.payments.get", async () => {
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { supabase } = auth;

    const { data } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return jsonOk({ payments: data ?? [] });
  });
}

type Body = {
  id?: string;
  action?: "confirm" | "refund";
  note?: string;
};

export async function PATCH(req: NextRequest) {
  return withErrorCapture("admin.payments.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { supabase, admin } = auth;

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.id || !body.action) return jsonError(400, "bad_request");

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("id", body.id)
      .maybeSingle();
    if (!payment) return jsonError(404, "not_found");

    if (body.action === "confirm") {
      // Idempotent: a second confirm click must not finalize (which would
      // create a duplicate subscription + transaction) for an already
      // succeeded payment.
      if (payment.status === "succeeded") return jsonOk({ ok: true, action: "confirm", skipped: true });

      await supabase.from("payments").update({ status: "succeeded" }).eq("id", payment.id);

      if (payment.business_id && payment.user_id) {
        const meta = (payment.metadata ?? {}) as Record<string, unknown>;
        if (meta.kind === "featured") {
          await supabase
            .from("featured_businesses")
            .update({ status: "active" })
            .eq("business_id", payment.business_id)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1);
        } else if (meta.planCode) {
          await finalizeSuccessfulPayment(supabase, {
            userId: payment.user_id,
            businessId: payment.business_id,
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
        }
        await notifyUser({
          recipientId: payment.user_id,
          type: "payment",
          title: "Payment confirmed",
          body: "Your payment has been confirmed by our team.",
          link: "/billing",
        });
      }
      return jsonOk({ ok: true, action: "confirm" });
    }

    // refund
    await supabase.from("payments").update({ status: "refunded", failure_reason: body.note ?? null }).eq("id", payment.id);
    await supabase.from("refunds").insert({
      payment_id: payment.id,
      amount_cents: payment.amount_cents,
      currency: payment.currency,
      reason: body.note ?? "admin",
      admin_id: admin.id,
      status: "completed",
    } as never);

    if (payment.user_id) {
      await notifyUser({
        recipientId: payment.user_id,
        type: "refund",
        title: "Refund issued",
        body: `A refund of ${(payment.amount_cents / 100).toFixed(2)} ${payment.currency} has been issued.`,
        link: "/billing",
      });
    }
    return jsonOk({ ok: true, action: "refund" });
  });
}