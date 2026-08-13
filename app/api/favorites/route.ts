import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import type { Database } from "@/lib/supabase/database.types";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

const favoriteTypes = ["business", "service", "product"] as const;
type FavoriteType = (typeof favoriteTypes)[number];
type Client = Awaited<ReturnType<typeof createClient>>;

const favoriteBodySchema = z.object({
  type: z.enum(favoriteTypes),
  id: z.string().uuid(),
});

const FAVORITES_SELECT =
  "id, item_type, business:businesses(id, name, logo_url, slug), service:services(id, name, photo_url), product:products(id, slug, name, price, compare_at_price, stock, images, status, featured), created_at";

async function getFavorites(supabase: Client, userId: string, typeFilter?: string | null) {
  let query = supabase
    .from("favorites")
    .select(FAVORITES_SELECT)
    .eq("user_id", userId);
  if (typeFilter && (favoriteTypes as readonly string[]).includes(typeFilter)) {
    query = query.eq("item_type", typeFilter);
  }
  query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) return null;
  return data ?? [];
}

/** True when the target row exists and is publicly favoritable. */
async function targetExists(supabase: Client, type: FavoriteType, id: string): Promise<boolean> {
  const table = type === "business" ? "businesses" : type === "service" ? "services" : "products";
  const statusFilter =
    type === "business"
      ? { column: "status", value: "approved" }
      : { column: "status", value: "published" };
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq(statusFilter.column, statusFilter.value)
    .maybeSingle();
  return !error && Boolean(data);
}

/* ---- POST /api/favorites  { type, id } ---- */
export async function POST(request: Request) {
  return withErrorCapture("favorites.create", async () => {
    const rl = rateLimit(request, { key: "favorites:mutate", limit: 60, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => ({}));
    const parsed = favoriteBodySchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "invalid_favorite");
    const { type, id } = parsed.data;

    if (!(await targetExists(supabase, type, id))) {
      return jsonError(404, `${type}_not_found`);
    }

    // Refinement: Consolidate the check for existing favorites.
    // The partial unique indexes on (user_id, item_type, <item>_id) make this query efficient.
    const idColumn = type === "business" ? "business_id" : type === "service" ? "service_id" : "product_id";
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("item_type", type)
      .eq(idColumn, id)
      .maybeSingle();

    if (existing) {
      return jsonOk({ ok: true, favorite: { id: existing.id } });
    }

    // Refinement: Consolidate the insert logic.
    const insertPayload: Database["public"]["Tables"]["favorites"]["Insert"] = {
      user_id: user.id,
      item_type: type,
      business_id: null,
      service_id: null,
      product_id: null,
    };
    insertPayload[idColumn as "business_id" | "service_id" | "product_id"] = id;

    const { data: inserted, error: insError } = await supabase
      .from("favorites")
      .insert(insertPayload)
      .select("id")
      .single(); // Use .single() as we expect one row back.

    if (insError) {
      // The partial unique index is the final guard against duplicate rows.
      if ((insError as { code?: string }).code === "23505") {
        const { data: existing } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq(idColumn, id)
          .maybeSingle();
        return jsonOk({ ok: true, favorite: { id: existing?.id ?? id } });
      }
      return jsonError(500, "favorite_create_failed");
    }
    return jsonOk({ ok: true, favorite: { id: inserted?.id ?? id } });
  });
}

/* ---- DELETE /api/favorites  { type, id } | legacy { id } (favorite row id) ---- */
export async function DELETE(request: Request) {
  return withErrorCapture("favorites.delete", async () => {
    const rl = rateLimit(request, { key: "favorites:mutate", limit: 60, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => ({}));

    let deleteOperation;

    // Attempt to parse as the new polymorphic delete format: { type, id }
    const parsedPolymorphic = favoriteBodySchema.safeParse(body);

    if (parsedPolymorphic.success) {
      const { type, id } = parsedPolymorphic.data;
      const idColumn = type === "business" ? "business_id" : type === "service" ? "service_id" : "product_id";
      deleteOperation = supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_type", type)
        .eq(idColumn, id);
    } else {
      // If not polymorphic, attempt to parse as the legacy format: { id } (favorite row ID)
      const parsedLegacy = z.object({ id: z.string().uuid() }).safeParse(body);
      if (!parsedLegacy.success) {
        // If neither schema matches, the payload is invalid
        return jsonError(400, "invalid_favorite_payload");
      }
      deleteOperation = supabase
        .from("favorites")
        .delete()
        .eq("id", parsedLegacy.data.id)
        .eq("user_id", user.id);
    }

    const { error } = await deleteOperation;
    if (error) {
      console.error("Supabase delete error:", error);
      return jsonError(500, "favorite_delete_failed");
    }
    return jsonOk({ ok: true });
  });
}

/* ---- GET /api/favorites [?type=] ---- */
export async function GET(request: Request) {
  return withErrorCapture("favorites.list", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const typeFilter = new URL(request.url).searchParams.get("type") ?? undefined;
    const favorites = await getFavorites(supabase, user.id, typeFilter);
    if (favorites === null) return jsonError(500, "load_failed");

    return jsonOk({ favorites });
  });
}