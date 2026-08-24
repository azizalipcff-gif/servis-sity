import { requireAdmin } from "@/lib/admin";
import { productModerationSchema } from "@/lib/validations/admin-schemas";
import { writeAudit } from "@/lib/security/audit";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { revalidateTag } from "next/cache";

export async function PATCH(request: Request) {
  return withErrorCapture("admin.products.patch", async () => {
    const rl = await rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = productModerationSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const { id, status, status_note } = parsed.data;

    const { data: current, error: readError } = await guard.supabase
      .from("products")
      .select("id, name, business_id, status")
      .eq("id", id)
      .maybeSingle();
    if (readError || !current) return jsonError(404, "not_found");

    const { error } = await guard.supabase
      .from("products")
      .update({ status })
      .eq("id", id);
    if (error) return jsonError(500, "update_failed");

    if (status === "published" && current.status !== "published" && current.business_id) {
      const { data: biz } = await guard.supabase
        .from("businesses")
        .select("owner_id, name")
        .eq("id", current.business_id)
        .maybeSingle();
      if (biz?.owner_id) {
        await guard.supabase.from("notifications").insert({
          recipient_id: biz.owner_id,
          type: "admin",
          title: biz.name ?? current.name ?? "",
          body: "PRODUCT_APPROVED",
          link: `/dashboard?tab=products`,
        });
      }
    }

    await writeAudit({
      actorId: guard.admin.id,
      action: "product.status_change",
      targetType: "product",
      targetId: id,
      metadata: {
        from: current.status,
        to: status,
        ...(status_note !== undefined ? { note: status_note } : {}),
      },
    });

    revalidateTag("products");

    return jsonOk();
  });
}
