import { requireAdmin } from "@/lib/admin";
import { categoryCreateSchema } from "@/lib/validations/admin-schemas";
import { slugify } from "@/lib/slug";
import { writeAudit } from "@/lib/security/audit";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export async function GET() {
  return withErrorCapture("admin.categories.get", async () => {
    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const { data, error } = await guard.supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return jsonError(500, "select_failed");
    return jsonOk(data ?? []);
  });
}

export async function POST(request: Request) {
  return withErrorCapture("admin.categories.post", async () => {
    const rl = rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = categoryCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const { name, slug, name_en, name_fr, name_ar, icon } = parsed.data;
    const { error } = await guard.supabase.from("categories").insert({
      slug: slugify(slug || name),
      name_en: name_en || name,
      name_fr: name_fr || name,
      name_ar: name_ar || name,
      icon: icon ?? null,
    });
    if (error) return jsonError(500, "insert_failed");

    await writeAudit({
      actorId: guard.admin.id,
      action: "category.create",
      targetType: "category",
      metadata: { name, slug: slugify(slug || name) },
    });
    return jsonOk();
  });
}

export async function DELETE(request: Request) {
  return withErrorCapture("admin.categories.delete", async () => {
    const rl = rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return jsonError(400, "bad_request");

    const { error } = await guard.supabase.from("categories").delete().eq("id", id);
    if (error) return jsonError(500, "delete_failed");

    await writeAudit({
      actorId: guard.admin.id,
      action: "category.delete",
      targetType: "category",
      targetId: id,
    });
    return jsonOk();
  });
}