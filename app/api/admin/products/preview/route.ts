import { requireAdmin } from "@/lib/admin";
import { uuidSchema } from "@/lib/validations/schemas";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

const MODERATION_AUDIT_ACTIONS = ["product.status_change"];

export async function GET(request: Request) {
  return withErrorCapture("admin.products.preview", async () => {
    const rl = await rateLimit(request, { key: "admin:read", limit: 600, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !uuidSchema.safeParse(id).success) return jsonError(400, "bad_request");

    const { supabase } = guard;

    const { data: product, error: prodError } = await supabase
      .from("products")
      .select(
        "*, categories!products_category_id_fkey(name_ar, name_fr, name_en), businesses(id, name, slug, owner_id, city)"
      )
      .eq("id", id)
      .maybeSingle();

    if (prodError || !product) return jsonError(404, "not_found");

    const ownerId = (product as { businesses?: { owner_id: string | null } | null }).businesses?.owner_id;

    const ownerRes = ownerId
      ? await supabase
          .from("profiles")
          .select("id, full_name, phone, city, website, avatar_url")
          .eq("id", ownerId)
          .maybeSingle()
      : null;

    const { data: audit } = await supabase
      .from("audit_logs")
      .select("id, action, metadata, created_at, profiles(full_name)")
      .eq("target_type", "product")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    return jsonOk({
      product,
      business: (product as { businesses?: unknown }).businesses ?? null,
      owner: ownerRes?.data ?? null,
      audit: ((audit ?? []) as unknown[]).map((row) => {
        const r = row as {
          id: string;
          action: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
          profiles: { full_name: string | null } | null;
        };
        return {
          id: r.id,
          action: r.action,
          metadata: r.metadata,
          created_at: r.created_at,
          actor: r.profiles?.full_name ?? null,
          isModeration: MODERATION_AUDIT_ACTIONS.includes(r.action),
        };
      }),
    });
  });
}
