import { NextRequest } from "next/server";
import { resolveProvider } from "@/lib/payments/provider";
import { createServiceClient } from "@/lib/supabase/server";
import { recordAttempt } from "@/lib/payments/service";
import { isTerminalPaymentStatus, paymentMatchesProvider } from "@/lib/payments/security";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ provider: string }> };

/**
 * Gateway webhook endpoint. Verifies the signature with the provider, then
 * mirrors the confirmed payment status onto the payment row via the service
 * role. Entitlement (subscription + business plan + transaction) is STILL
 * granted only by an admin confirm — this route only records what the gateway
 * reported, so a forged/mirrored status can never escalate a plan by itself.
 */
export async function POST(req: NextRequest, { params }: Props) {
  return withErrorCapture("webhooks.payment", async () => {
    const { provider: providerCode } = await params;
    const provider = resolveProvider(providerCode);
    if (provider.code !== providerCode) return jsonError(404, "provider_not_found");
    if (!provider.configured()) return jsonError(404, "provider_not_configured");

    const body = await req.text();
    const result = await provider.handleWebhook(req.headers, body);
    if (!result.status) return jsonOk({ ok: true, event: result.event });

    const sb = createServiceClient();
    if (!sb) return jsonError(500, "service_role_unconfigured");

    // Match by provider reference (session/order id) OR idempotency key. Both
    // lookups are scoped to this webhook's provider so an (unsigned) webhook
    // from one gateway can never update a payment recorded under another.
    let payment = null;
    for (const ref of result.references) {
      if (!ref) continue;
      const byProvider = await sb
        .from("payments")
        .select("id,status,provider,provider_payment_id,idempotency_key,user_id,business_id")
        .eq("provider", provider.code)
        .eq("provider_payment_id", ref)
        .maybeSingle();
      if (byProvider.data) {
        payment = byProvider.data;
        break;
      }
      const byKey = await sb
        .from("payments")
        .select("id,status,provider,provider_payment_id,idempotency_key,user_id,business_id")
        .eq("provider", provider.code)
        .eq("idempotency_key", ref)
        .maybeSingle();
      if (byKey.data) {
        payment = byKey.data;
        break;
      }
    }
    if (!payment) return jsonOk({ ok: true, event: result.event, matched: false });

    // Belt & braces: the provider filter above already guarantees this, but a
    // payment whose status is terminal must never be moved again.
    if (!paymentMatchesProvider(provider.code, payment as { provider?: string | null })) {
      return jsonOk({ ok: true, event: result.event, matched: false });
    }

    // Idempotent delivery: a duplicate webhook for the same state is a no-op.
    if (payment.status === result.status)
      return jsonOk({ ok: true, event: result.event, matched: true, noop: true });

    // Only forward transitions: succeeded/refunded are terminal from the gateway.
    if (isTerminalPaymentStatus(payment.status)) {
      return jsonOk({ ok: true, event: result.event, matched: true, terminal: true });
    }

    const { error: updErr } = await sb
      .from("payments")
      .update({ status: result.status })
      .eq("id", payment.id);
    if (updErr) throw new Error(`webhooks:update:${updErr.message}`);

    await recordAttempt(sb, payment.id, provider.code, result.status, {
      response: { source: "webhook", event: result.event },
    });

    return jsonOk({ ok: true, event: result.event, matched: true });
  });
}
