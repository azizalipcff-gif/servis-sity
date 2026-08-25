import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { writeAudit } from "@/lib/security/audit";
import { uuidSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

/**
 * Securely revoke every active session for a target user.
 *
 * The installed Supabase Auth SDK only exposes `auth.admin.signOut(jwt)` which
 * revokes the *caller's own* sessions, so client-side userId revocation is not
 * possible. Instead we call the `admin_revoke_user_sessions` RPC, a
 * SECURITY DEFINER function that deletes the target user's rows from the auth
 * session/refresh-token tables. The function enforces admin-only access and
 * blocks self-revocation. The service-role key is never used here (the RPC
 * validates `auth.uid()`), and is never exposed to the browser.
 */
export async function POST(req: NextRequest) {
  return withErrorCapture("admin.users.force_logout", async () => {
    const rl = await rateLimit(req, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const body = await req.json().catch(() => null);
    const id = body && typeof body === "object" ? (body as { id?: unknown }).id : undefined;
    if (typeof id !== "string" || !uuidSchema.safeParse(id).success) {
      return jsonError(400, "bad_request");
    }
    if (id === guard.admin.id) return jsonError(400, "cannot_logout_self");

    const { error } = await guard.supabase.rpc("admin_revoke_user_sessions", { p_user_id: id });
    if (error) return jsonError(502, "logout_failed");

    await writeAudit({
      actorId: guard.admin.id,
      action: "user.force_logout",
      targetType: "user",
      targetId: id,
    });
    return jsonOk();
  });
}
