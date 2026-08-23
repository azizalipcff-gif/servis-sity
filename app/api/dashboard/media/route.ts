import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { getMyBusiness } from "@/lib/queries";
import { parseStoredUrl } from "@/lib/supabase/storage";
import { mediaCreateSchema } from "@/lib/validations/schemas";
import { sanitizeUrl } from "@/lib/security/sanitize";
import { uuidSchema } from "@/lib/validations/schemas";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

async function guard() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const business = user ? await getMyBusiness(user.id) : null;
  return { user, business, supabase };
}

export async function POST(request: Request) {
  return withErrorCapture("dashboard.media.post", async () => {
    const rl = await rateLimit(request, { key: "media:create", limit: 30, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const { user, business, supabase } = await guard();
    if (!user || !business) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = mediaCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const url = sanitizeUrl(parsed.data.url);
    if (!url) return jsonError(400, "invalid_url");

    // Ownership: if this points to our Storage, it must live in the caller's
    // own owner-folder (first path segment == the caller). This stops a user
    // from attaching another user's stored image to their gallery.
    const stored = parseStoredUrl(url);
    if (stored && stored.key.split("/")[0] !== user.id) {
      return jsonError(403, "forbidden");
    }

    const max = await supabase
      .from("media")
      .select("sort_order", { count: "exact", head: true })
      .eq("business_id", business.id);
    const nextOrder = (max.count ?? 0) + 1;

    const { data, error } = await supabase
      .from("media")
      .insert({
        business_id: business.id,
        type: parsed.data.type,
        url,
        sort_order: nextOrder,
      })
      .select("id")
      .single();

    if (error) return jsonError(500, "insert_failed");
    return jsonOk({ ok: true, id: data?.id });
  });
}

export async function DELETE(request: Request) {
  return withErrorCapture("dashboard.media.delete", async () => {
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const { user, business, supabase } = await guard();
    if (!user || !business) return jsonError(401, "unauthorized");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !uuidSchema.safeParse(id).success) return jsonError(400, "bad_request");

    // Fetch the row first so we can remove the storage object it references
    // (scoped to the business the caller owns) — never leave orphan files.
    const { data: existing } = await supabase
      .from("media")
      .select("url")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();

    const { error } = await supabase
      .from("media")
      .delete()
      .eq("id", id)
      .eq("business_id", business.id);

    if (error) return jsonError(500, "delete_failed");

    // Delete the storage object referenced by the removed row. The server
    // client is authenticated as the caller, so owner-scoped RLS applies;
    // foreign objects (external/demo URLs) are skipped by parseStoredUrl.
    const stored = existing ? parseStoredUrl(existing.url) : null;
    if (stored && stored.key.split("/")[0] === user.id) {
      await supabase.storage.from(stored.bucket).remove([stored.key]);
    }

    return jsonOk();
  });
}