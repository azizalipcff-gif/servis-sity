import { requireAdmin } from "@/lib/admin";
import { serviceModerationSchema } from "@/lib/validations/admin-schemas";
import { buildModerationPatch } from "@/lib/moderation";
import { writeAudit } from "@/lib/security/audit";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { revalidateTag } from "next/cache";

export async function PATCH(request: Request) {
  return withErrorCapture("admin.services.patch", async () => {
    const rl = await rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const reqUrl = new URL(request.url);
    const queryId = reqUrl.searchParams.get("id");
    const parsed = serviceModerationSchema.safeParse({ ...(body ?? {}), id: queryId });
    if (!parsed.success) return jsonError(400, "bad_request");

    const { id, status, status_note } = parsed.data;

    const { data: current, error: readError } = await guard.supabase
      .from("services")
      .select("id, name, business_id, status")
      .eq("id", id)
      .maybeSingle();
    if (readError || !current) return jsonError(404, "not_found");

    const patch = buildModerationPatch(status);

    const { error } = await guard.supabase
      .from("services")
      .update(patch)
      .eq("id", id);
    if (error) return jsonError(500, "update_failed");

    if (current.business_id) {
      const { data: biz } = await guard.supabase
        .from("businesses")
        .select("owner_id, name")
        .eq("id", current.business_id)
        .maybeSingle();
      if (biz?.owner_id) {
        if (status === "published") {
          await guard.supabase.from("notifications").insert({
            recipient_id: biz.owner_id,
            type: "admin",
            title: biz.name ?? current.name ?? "",
            body: "SERVICE_APPROVED",
            link: `/dashboard?tab=services`,
          });
        } else if (status === "archived") {
          await guard.supabase.from("notifications").insert({
            recipient_id: biz.owner_id,
            type: "admin",
            title: biz.name ?? current.name ?? "",
            body: "SERVICE_REJECTED",
            link: `/dashboard?tab=services`,
          });
        }
      }
    }

    await writeAudit({
      actorId: guard.admin.id,
      action: "service.status_change",
      targetType: "service",
      targetId: id,
      metadata: {
        from: current.status,
        to: status,
        ...(status_note !== undefined ? { note: status_note } : {}),
      },
    });

    revalidateTag("services");

    return jsonOk();
  });
}
