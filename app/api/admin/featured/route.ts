import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

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
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      action?: "approve" | "revoke" | "renew";
    };
    if (!body.id || !body.action) return jsonError(400, "bad_request");

    const now = new Date();
    const patch: Record<string, unknown> =
      body.action === "approve"
        ? { status: "active", starts_at: now.toISOString(), expires_at: new Date(now.getTime() + 86400000 * 30).toISOString() }
        : body.action === "renew"
          ? { status: "active", starts_at: now.toISOString(), expires_at: new Date(now.getTime() + 86400000 * 30).toISOString() }
          : { status: "revoked" };

    const { data } = await auth.supabase
      .from("featured_businesses")
      .update(patch as never)
      .eq("id", body.id)
      .select("*")
      .single();
    return jsonOk({ item: data ?? null });
  });
}