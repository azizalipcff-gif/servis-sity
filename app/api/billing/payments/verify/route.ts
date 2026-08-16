import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { resolveProvider } from "@/lib/payments/provider";
import { recordAttempt } from "@/lib/payments/service";
import { uuidSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

/**
 * Polled by the client after checkout. Mirrors the gateway-reported status
 * back onto the payment row. Entitlement (subscription + business plan) is
 * granted ONLY by an admin via the admin payments confirm action, never by
 * the payer's own session — otherwise a user could craft a payments row
 * (RLS allows inserting/updating their own rows) with arbitrary metadata
 * and provider references to escalate their plan for free.
 */
export async function POST(req: NextRequest) {
  return withErrorCapture("billing.payments.verify", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const limited = rateLimit(req, { key: "billing.payments.verify", limit: 20, windowMs: 60000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfter);

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as { paymentId?: string };
    if (!body.paymentId || !uuidSchema.safeParse(body.paymentId).success) {
      return jsonError(400, "bad_request");
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("id", body.paymentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!payment) return jsonError(404, "not_found");
    if (payment.status === "succeeded") return jsonOk({ status: "succeeded" });

    const provider = resolveProvider(payment.provider);

    // Manual gateway stays pending until an admin confirms the transfer.
    if (provider.code === "manual" || payment.status === "pending") {
      return jsonOk({ status: payment.status });
    }

    const verification = await provider.verifyPayment(payment.provider_payment_id ?? "");

    await recordAttempt(supabase, payment.id, provider.code, verification.status, {
      response: verification.raw,
    });

    if (verification.status !== "succeeded") {
      await supabase
        .from("payments")
        .update({ status: verification.status, failure_reason: null })
        .eq("id", payment.id);
      return jsonOk({ status: verification.status });
    }

    // Gateway confirms the payment went through — reflect that, but leave the
    // subscription/plan grant to the admin confirm action (single grant path).
    await supabase
      .from("payments")
      .update({
        status: "succeeded",
        provider_payment_id: verification.providerPaymentId ?? payment.provider_payment_id,
      })
      .eq("id", payment.id);

    return jsonOk({ status: "succeeded", pendingActivation: true });
  });
}