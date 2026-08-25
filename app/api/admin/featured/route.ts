import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { writeAudit } from "@/lib/security/audit";
import { featuredPatchSchema } from "@/lib/validations/admin-schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  return withErrorCapture("admin.featured.get", async () => {
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { data } = await auth.supabase
      .from("featured_businesses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return jsonOk({ items: data ?? [] });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorCapture("admin.featured.patch", async () => {
    const rl = await rateLimit(req, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = await req.json().catch(() => null);
    const parsed = featuredPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");
    const { id, action } = parsed.data;

    const now = new Date();
    const patch: Record<string, unknown> =
      action === "approve"
        ? { status: "active", starts_at: now.toISOString(), expires_at: new Date(now.getTime() + 86400000 * 30).toISOString() }
        : action === "renew"
          ? { status: "active", starts_at: now.toISOString(), expires_at: new Date(now.getTime() + 86400000 * 30).toISOString() }
          : { status: "revoked" };

    const { data, error } = await auth.supabase
      .from("featured_businesses")
      .update(patch as never)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return jsonError(500, "update_failed");

    await writeAudit({
      actorId: auth.admin.id,
      action: "featured.change",
      targetType: "featured_business",
      targetId: id,
      metadata: { action },
    });

    return jsonOk({ item: data ?? null });
  });
}