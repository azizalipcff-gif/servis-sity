import { requireAdmin } from "@/lib/admin";
import { reportPatchSchema } from "@/lib/validations/admin-schemas";
import { writeAudit } from "@/lib/security/audit";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export async function PATCH(request: Request) {
  return withErrorCapture("admin.reports.patch", async () => {
    const rl = rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = reportPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const { id, status } = parsed.data;
    const { error } = await guard.supabase
      .from("reports")
      .update({ status })
      .eq("id", id);
    if (error) return jsonError(500, "update_failed");

    await writeAudit({
      actorId: guard.admin.id,
      action: "report.resolve",
      targetType: "report",
      targetId: id,
      metadata: { status },
    });
    return jsonOk();
  });
}