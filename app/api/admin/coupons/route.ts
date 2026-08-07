import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return withErrorCapture("admin.coupons.get", async () => {
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { data } = await auth.supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return jsonOk({ coupons: data ?? [] });
  });
}

type Body = {
  code?: string;
  type?: string;
  value?: number;
  applies_to?: string;
  active?: boolean;
  max_usage?: number;
  per_user_limit?: number;
  expires_at?: string | null;
  amount_total_cents?: number;
  period?: string;
  plans?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  return withErrorCapture("admin.coupons.post", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.code || !body.type || body.value === undefined)
      return jsonError(400, "bad_request");

    const { data } = await auth.supabase
      .from("coupons")
      .insert({
        code: body.code,
        type: body.type,
        value: body.value,
        amount_total_cents: Number(body.amount_total_cents ?? 0),
        period: body.period ?? "one_time",
        active: true,
        max_usage: body.max_usage ?? null,
        per_user_limit: body.per_user_limit ?? 1,
        applies_to: body.applies_to ?? "subscription",
        plans: body.plans ?? {},
        expires_at: body.expires_at ?? null,
        created_by: auth.admin.id,
      })
      .select("*")
      .single();

    return jsonOk({ coupon: data ?? null });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorCapture("admin.coupons.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = (await req.json().catch(() => ({}))) as { id?: string; active?: boolean } & Body;
    if (!body.id) return jsonError(400, "bad_request");

    const patch: Record<string, unknown> = {};
    if (body.active !== undefined) patch.active = body.active;
    if (body.max_usage !== undefined) patch.max_usage = body.max_usage;
    if (body.expires_at !== undefined) patch.expires_at = body.expires_at;

    const { data } = await auth.supabase
      .from("coupons")
      .update(patch as never)
      .eq("id", body.id)
      .select("*")
      .single();
    return jsonOk({ coupon: data ?? null });
  });
}