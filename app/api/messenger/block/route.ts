import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorCapture("messenger.block", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const limited = rateLimit(req, { key: "block", limit: 20, windowMs: 60000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfter);

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      userId?: string;
    };
    const other = body.userId;
    if (!other || other === user.id) return jsonError(400, "bad_request");

    if (body.action === "block") {
      const { error } = await supabase.from("blocked_users").insert({
        user_id: user.id,
        blocked_user_id: other,
      });
      if (error) return jsonError(500, "update_failed");
      return jsonOk({ ok: true });
    }
    if (body.action === "unblock") {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("user_id", user.id)
        .eq("blocked_user_id", other);
      if (error) return jsonError(500, "update_failed");
      return jsonOk({ ok: true });
    }
    return jsonError(400, "bad_request");
  });
}