import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { finalizeSuccessfulPayment } from "@/lib/payments/service";
import { resolveProvider } from "@/lib/payments/provider";
import { notifyUser } from "@/lib/notifications";
import { paymentPatchSchema } from "@/lib/validations/admin-schemas";
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

export async function PATCH(req: NextRequest) {
  return withErrorCapture("admin.payments.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { supabase } = auth;

    const body = await req.json().catch(() => null);
    const parsed = paymentPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");
    const { id, action, note } = parsed.data;

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!payment) return jsonError(404, "not_found");

    if (action === "confirm") {
      // Idempotent: a second confirm click must not finalize (which would
      // create a duplicate subscription + transaction) for an already
      // finalized payment. We cannot key off payment.status here: the verify
      // route mirrors the gateway and marks online payments "succeeded" BEFORE
      // admin confirmation, so a status-based guard would skip every online
      // payment. The durable marker of finalization is a transaction already
      // linked to the payment.
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("payment_id", payment.id)
        .maybeSingle();
      if (existingTx) return jsonOk({ ok: true, action: "confirm", skipped: true });

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
          link: "/dashboard/billing",
        });
      }
      return jsonOk({ ok: true, action: "confirm" });
    }

    // refund — only on a paid (succeeded) payment; idempotent per payment.
    if (payment.status !== "succeeded") return jsonError(400, "payment_not_refundable");

    const provider = resolveProvider(payment.provider);

    // Execute the refund at the gateway first; only then persist the ledger
    // state. Manual/cmi/payzone refunds are no-ops that still return a local
    // reference, so the DB state stays consistent.
    let providerRefundId: string | null = null;
    if (payment.provider_payment_id) {
      try {
        const res = await provider.refund(payment.provider_payment_id);
        providerRefundId = res.providerRefundId ?? null;
      } catch {
        return jsonError(502, "refund_failed");
      }
    }

    const { data: refundId, error: refundErr } = await supabase.rpc(
      "finalize_payment_refund",
      {
        p_payment_id: payment.id,
        p_provider_refund_id: providerRefundId,
        p_reason: note ?? null,
      },
    );
    if (refundErr) return jsonError(500, "refund_record_failed");

    if (payment.user_id) {
      await notifyUser({
        recipientId: payment.user_id,
        type: "refund",
        title: "Refund issued",
        body: `A refund of ${(payment.amount_cents / 100).toFixed(2)} ${payment.currency} has been issued.`,
        link: "/dashboard/billing",
      });
    }
    return jsonOk({ ok: true, action: "refund", refundId });
  });
}