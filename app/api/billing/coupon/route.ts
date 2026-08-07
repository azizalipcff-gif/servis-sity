import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { applyCoupon } from "@/lib/billing/coupons";
import { computeTotals } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorCapture("billing.coupon", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      code?: string;
      planCode?: string;
      subtotalCents?: number;
    };
    if (!body.code || !body.planCode) return jsonError(400, "bad_request");

    try {
      const coupon = await applyCoupon(
        body.code,
        user.id,
        body.planCode,
        body.subtotalCents ?? 0,
      );
      const totals = computeTotals(body.subtotalCents ?? 0, coupon.discountCents, "MAD");
      return jsonOk({ discountCents: coupon.discountCents, totals });
    } catch (e) {
      return jsonError(400, String(e instanceof Error ? e.message : "coupon_invalid"));
    }
  });
}