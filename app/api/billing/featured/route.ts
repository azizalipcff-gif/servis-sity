import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { recordPayment } from "@/lib/payments/service";
import { featuredPurchaseSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

const FEATURED_PRICE = Number(process.env.FEATURED_PRICE_CENTS ?? 19900);
const FEATURED_CURRENCY = process.env.FEATURED_CURRENCY ?? "MAD";

export async function GET() {
  return withErrorCapture("billing.featured", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const business = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!business.data) return jsonOk({ items: [] });

    const { data } = await supabase
      .from("featured_businesses")
      .select("*")
      .eq("business_id", business.data.id)
      .order("created_at", { ascending: false })
      .limit(20);
    return jsonOk({ items: data ?? [] });
  });
}

export async function POST(req: NextRequest) {
  return withErrorCapture("billing.featured.post", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const limited = rateLimit(req, { key: "billing.featured", limit: 10, windowMs: 60000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfter);

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = await req.json().catch(() => null);
    const parsed = featuredPurchaseSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");
    const { businessId, surface } = parsed.data;

    const owner = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!owner.data) return jsonError(403, "forbidden");

    // Idempotency: reject while a pending slot already exists for this
    // business+surface (prevents duplicate pending purchases from retries).
    const { data: existing } = await supabase
      .from("featured_businesses")
      .select("id")
      .eq("business_id", businessId)
      .eq("surface", surface)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (existing) return jsonError(409, "featured_pending");

    const payment = await recordPayment(supabase, {
      userId: user.id,
      businessId,
      subscriptionId: null,
      provider: "manual",
      amountCents: FEATURED_PRICE,
      currency: FEATURED_CURRENCY,
      status: "pending",
      idempotencyKey: `featured:${businessId}:${surface}`,
      metadata: { kind: "featured", surface },
    });

    const now = new Date();
    const { data, error: insertError } = await supabase
      .from("featured_businesses")
      .insert({
        business_id: businessId,
        surface,
        starts_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 86400000 * 30).toISOString(),
        priority: 1,
        status: "pending",
        price_cents: FEATURED_PRICE,
        currency: FEATURED_CURRENCY,
      })
      .select("*")
      .single();
    if (insertError) {
      // Concurrent double-submit: the partial unique index
      // (business_id, surface) WHERE status IN ('active','pending') rejects the
      // second pending slot with 23505. Treat it as the same "already pending"
      // outcome as the check above instead of a 502.
      if ((insertError as { code?: string }).code === "23505") {
        return jsonError(409, "featured_pending");
      }
      return jsonError(502, "featured_activation_failed");
    }
    if (!data) return jsonError(502, "featured_activation_failed");

    return jsonOk({ item: data, paymentId: payment.id, paymentRef: payment.id });
  });
}