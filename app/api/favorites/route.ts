import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return withErrorCapture("favorites.list", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const { data, error } = await supabase
      .from("favorites")
      .select("id, created_at, business:businesses(id, name, logo_url, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return jsonError(500, "load_failed");
    return jsonOk({ favorites: data ?? [] });
  });
}

export async function DELETE(request: Request) {
  return withErrorCapture("favorites.delete", async () => {
    const rl = rateLimit(request, { key: "favorites:mutate", limit: 60, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await request.json().catch(() => ({}))) as { id?: string };
    if (!body.id) return jsonError(400, "bad_request");

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", body.id)
      .eq("user_id", user.id);
    if (error) return jsonError(500, "delete_failed");
    return jsonOk({ ok: true });
  });
}