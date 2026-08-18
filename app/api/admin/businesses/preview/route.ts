import { requireAdmin } from "@/lib/admin";
import { uuidSchema } from "@/lib/validations/schemas";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

const MODERATION_AUDIT_ACTIONS = [
  "business.status_change",
  "business.verify",
  "business.reject_verification",
];

export async function GET(request: Request) {
  return withErrorCapture("admin.businesses.preview", async () => {
    const rl = rateLimit(request, { key: "admin:read", limit: 600, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !uuidSchema.safeParse(id).success) return jsonError(400, "bad_request");

    const { supabase } = guard;

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("*, categories!businesses_category_id_fkey(name_ar, name_fr, name_en)")
      .eq("id", id)
      .maybeSingle();

    if (bizError || !business) return jsonError(404, "not_found");

    const [services, hours, media, owner, audit] = await Promise.all([
      supabase
        .from("services")
        .select("id, name, description, price, duration_minutes, photo_url, gallery, status")
        .eq("business_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("business_hours")
        .select("id, day_of_week, open_time, close_time, is_closed")
        .eq("business_id", id)
        .order("day_of_week", { ascending: true }),
      supabase
        .from("media")
        .select("id, url")
        .eq("business_id", id)
        .eq("type", "image")
        .order("sort_order", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, phone, city, website, avatar_url")
        .eq("id", business.owner_id)
        .maybeSingle(),
      supabase
        .from("audit_logs")
        .select("id, action, metadata, created_at, profiles(full_name)")
        .eq("target_type", "business")
        .eq("target_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return jsonOk({
      business,
      owner: owner.data ?? null,
      services: services.data ?? [],
      hours: hours.data ?? [],
      media: media.data ?? [],
      audit: ((audit.data ?? []) as unknown[]).map((row) => {
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