import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { uuidSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

type Target = { type: "business"; id: string } | { type: "user"; id: string };

function parseTarget(searchParams: URLSearchParams): Target | null {
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (!id || !uuidSchema.safeParse(id).success) return null;
  if (type === "business") return { type: "business", id };
  if (type === "user") return { type: "user", id };
  return null;
}

export async function GET(req: NextRequest) {
  return withErrorCapture("follow.get", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    const target = parseTarget(new URL(req.url).searchParams);
    if (!target) return jsonError(400, "bad_request");

    const followers = await (async () => {
      let q = supabase.from("follows").select("id", { count: "exact", head: true });
      q =
        target.type === "business"
          ? q.eq("business_id", target.id).eq("following_type", "business")
          : q.eq("user_id", target.id).eq("following_type", "user");
      const { count, error } = await q;
      return error ? 0 : count ?? 0;
    })();

    let isFollowing = false;
    if (user) {
      let query = supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", user.id);
      query =
        target.type === "business"
          ? query.eq("business_id", target.id).eq("following_type", "business")
          : query.eq("user_id", target.id).eq("following_type", "user");
      const { count } = await query;
      isFollowing = (count ?? 0) > 0;
    }

    return jsonOk({
      type: target.type,
      id: target.id,
      isFollowing,
      followers,
    });
  });
}

export async function POST(req: NextRequest) {
  return withErrorCapture("follow.toggle", async () => {
    const rl = rateLimit(req, { key: "follow:toggle", limit: 30, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as { type?: string; id?: string };
    if (!body.type || !body.id || !uuidSchema.safeParse(body.id).success) {
      return jsonError(400, "bad_request");
    }
    let target: Target | null = null;
    if (body.type === "business") target = { type: "business", id: body.id };
    else if (body.type === "user") target = { type: "user", id: body.id };
    if (!target) return jsonError(400, "bad_request");
    if (target.type === "user" && target.id === user.id) {
      return jsonError(400, "bad_request");
    }

    const match = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_type", target.type)
      .eq(target.type === "business" ? "business_id" : "user_id", target.id)
      .maybeSingle();
    const existing = match.data;

    if (existing) {
      const { error } = await supabase.from("follows").delete().eq("id", existing.id);
      if (error) return jsonError(500, "delete_failed");
      return jsonOk({ ok: true, following: false });
    }

    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_type: target.type,
      ...(target.type === "business" ? { business_id: target.id } : { user_id: target.id }),
    });
    if (error) {
      // The partial unique indexes (follows_business_unique / follows_user_unique)
      // reject a duplicate follow on a concurrent race. A second request that
      // reaches the insert is effectively "following", so return that state.
      if ((error as { code?: string }).code === "23505") {
        return jsonOk({ ok: true, following: true });
      }
      return jsonError(500, "insert_failed");
    }
    return jsonOk({ ok: true, following: true });
  });
}