import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorCapture("notifications.list", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 50);

    const { data, error } = await supabase
      .from("notifications")
      .select("id,type,title,body,link,read_at,created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    const { count: unread } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null);

    if (error) return jsonError(500, "load_failed");
    return jsonOk({ notifications: data, unread: unread ?? 0 });
  });
}

export async function PATCH(req: Request) {
  return withErrorCapture("notifications.update", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as { markAll?: boolean; id?: string };

    if (body.markAll) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .is("read_at", null);
      if (error) return jsonError(500, "update_failed");
      return jsonOk({ ok: true });
    }

    if (!body.id) return jsonError(400, "bad_request");
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("recipient_id", user.id);
    if (error) return jsonError(500, "update_failed");
    return jsonOk({ ok: true });
  });
}