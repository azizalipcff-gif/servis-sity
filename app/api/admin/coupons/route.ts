import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { couponCreateSchema, couponPatchSchema } from "@/lib/validations/admin-schemas";

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

export async function POST(req: NextRequest) {
  return withErrorCapture("admin.coupons.post", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = await req.json().catch(() => null);
    const parsed = couponCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const c = parsed.data;
    const { data, error } = await auth.supabase
      .from("coupons")
      .insert({
        code: c.code.trim().toUpperCase(),
        type: c.type,
        value: c.value,
        amount_total_cents: c.amount_total_cents ?? 0,
        period: c.period,
        active: c.active ?? true,
        max_usage: c.max_usage ?? null,
        per_user_limit: c.per_user_limit ?? 1,
        applies_to: c.applies_to,
        plans: c.plans ?? {},
        expires_at: c.expires_at ?? null,
        created_by: auth.admin.id,
      })
      .select("*")
      .single();

    if (error) return jsonError(500, "insert_failed");
    return jsonOk({ coupon: data ?? null });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorCapture("admin.coupons.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = await req.json().catch(() => null);
    const parsed = couponPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const c = parsed.data;
    const patch: Record<string, unknown> = {};
    if (c.active !== undefined) patch.active = c.active;
    if (c.max_usage !== undefined) patch.max_usage = c.max_usage;
    if (c.expires_at !== undefined) patch.expires_at = c.expires_at;

    const { data, error } = await auth.supabase
      .from("coupons")
      .update(patch as never)
      .eq("id", c.id)
      .select("*")
      .single();

    if (error) return jsonError(500, "update_failed");
    return jsonOk({ coupon: data ?? null });
  });
}