import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { getMyBusiness } from "@/lib/queries";
import { bookingPatchSchema } from "@/lib/validations/schemas";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export async function PATCH(request: Request) {
  return withErrorCapture("dashboard.bookings.patch", async () => {
    const rl = await rateLimit(request, { key: "booking:update", limit: 60, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = bookingPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const business = await getMyBusiness(user.id);
    if (!business) return jsonError(403, "forbidden");

    const supabase = await createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.booking_id)
      .eq("business_id", business.id);

    if (error) return jsonError(500, "update_failed");
    return jsonOk();
  });
}