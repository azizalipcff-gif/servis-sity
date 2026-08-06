import { requireAdmin } from "@/lib/admin";
import { cityCreateSchema } from "@/lib/validations/admin-schemas";
import { writeAudit } from "@/lib/security/audit";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export async function GET() {
  return withErrorCapture("admin.cities.get", async () => {
    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const { data, error } = await guard.supabase
      .from("cities")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return jsonError(500, "select_failed");
    return jsonOk(data ?? []);
  });
}

export async function POST(request: Request) {
  return withErrorCapture("admin.cities.post", async () => {
    const rl = rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = cityCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const { name, slug, name_en, name_fr, name_ar } = parsed.data;
    const finalSlug =
      slug || name.toLowerCase().trim().replace(/\s+/g, "-");
    const { error } = await guard.supabase.from("cities").insert({
      slug: finalSlug,
      name_en: name_en || name,
      name_fr: name_fr || name,
      name_ar: name_ar || name,
    });
    if (error) return jsonError(500, "insert_failed");

    await writeAudit({
      actorId: guard.admin.id,
      action: "city.create",
      targetType: "city",
      metadata: { name, slug: finalSlug },
    });
    return jsonOk();
  });
}

export async function DELETE(request: Request) {
  return withErrorCapture("admin.cities.delete", async () => {
    const rl = rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return jsonError(400, "bad_request");

    const { error } = await guard.supabase.from("cities").delete().eq("id", id);
    if (error) return jsonError(500, "delete_failed");

    await writeAudit({
      actorId: guard.admin.id,
      action: "city.delete",
      targetType: "city",
      targetId: id,
    });
    return jsonOk();
  });
}