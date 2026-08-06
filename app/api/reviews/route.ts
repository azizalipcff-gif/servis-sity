import { createClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validations/schemas";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export async function POST(request: Request) {
  return withErrorCapture("reviews.post", async () => {
    const rl = rateLimit(request, { key: "review:create", limit: 10, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const body = await request.json().catch(() => null);
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError(401, "unauthorized");

    const comment = parsed.data.comment ? parsed.data.comment.trim() : null;

    const { error } = await supabase.from("reviews").insert({
      business_id: parsed.data.business_id,
      user_id: user.id,
      rating: parsed.data.rating,
      comment,
    });

    if (error) return jsonError(500, "insert_failed");
    return jsonOk();
  });
}