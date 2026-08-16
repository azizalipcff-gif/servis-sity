import { requireAdmin } from "@/lib/admin";
import { userPatchSchema } from "@/lib/validations/admin-schemas";
import { uuidSchema } from "@/lib/validations/schemas";
import type { UserRole } from "@/lib/supabase/database.types";
import { writeAudit } from "@/lib/security/audit";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export async function PATCH(request: Request) {
  return withErrorCapture("admin.users.patch", async () => {
    const rl = rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = userPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const { id, role, banned, suspended } = parsed.data;
    const patch: { role?: UserRole; banned?: boolean; suspended?: boolean } = {};
    if (role) patch.role = role;
    if (banned !== undefined) patch.banned = banned;
    if (suspended !== undefined) patch.suspended = suspended;

    const { error } = await guard.supabase.from("profiles").update(patch).eq("id", id);
    if (error) return jsonError(500, "update_failed");

    const action = role
      ? "user.role_change"
      : banned
        ? "user.ban"
        : banned === false
          ? "user.unban"
          : suspended
            ? "user.suspend"
            : "user.unsuspend";
    await writeAudit({
      actorId: guard.admin.id,
      action,
      targetType: "user",
      targetId: id,
      metadata: patch,
    });

    return jsonOk();
  });
}

export async function DELETE(request: Request) {
  return withErrorCapture("admin.users.delete", async () => {
    const rl = rateLimit(request, { key: "admin.mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !uuidSchema.safeParse(id).success) return jsonError(400, "bad_request");

    const { error } = await guard.supabase.from("profiles").delete().eq("id", id);
    if (error) return jsonError(500, "delete_failed");

    await writeAudit({
      actorId: guard.admin.id,
      action: "user.delete",
      targetType: "user",
      targetId: id,
    });
    return jsonOk();
  });
}