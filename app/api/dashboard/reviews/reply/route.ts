import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { getMyBusiness } from "@/lib/queries";
import { replySchema } from "@/lib/validations/schemas";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export async function POST(request: Request) {
  return withErrorCapture("dashboard.reviews.reply", async () => {
    const rl = rateLimit(request, { key: "review:reply", limit: 30, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const business = await getMyBusiness(user.id);
    if (!business) return jsonError(403, "forbidden");

    const supabase = await createClient();
    const { error } = await supabase
      .from("reviews")
      .update({ reply: parsed.data.reply.trim() || null })
      .eq("id", parsed.data.review_id)
      .eq("business_id", business.id);

    if (error) return jsonError(500, "update_failed");
    return jsonOk();
  });
}