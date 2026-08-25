import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { writeAudit } from "@/lib/security/audit";
import { planCreateSchema, planPatchSchema } from "@/lib/validations/admin-schemas";
import { uuidSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  return withErrorCapture("admin.plans.get", async () => {
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { data } = await auth.supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("interval", { ascending: true });
    return jsonOk({ plans: data ?? [] });
  });
}

export async function POST(req: NextRequest) {
  return withErrorCapture("admin.plans.post", async () => {
    const rl = await rateLimit(req, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = await req.json().catch(() => null);
    const parsed = planCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const p = parsed.data;
    const { data, error } = await auth.supabase
      .from("plans")
      .insert({
        plan_key: p.plan_key,
        interval: p.interval,
        name: p.name,
        price_cents: p.price_cents,
        currency: p.currency,
        trial_days: p.trial_days,
        sort_order: p.sort_order,
        active: p.active,
        limits: p.limits,
        features: p.features,
      })
      .select("*")
      .single();
    if (error) return jsonError(502, "plan_insert_failed");
    await writeAudit({
      actorId: auth.admin.id,
      action: "plan.change",
      targetType: "plan",
      targetId: data?.id ?? null,
      metadata: { action: "create", plan_key: p.plan_key, interval: p.interval },
    });
    return jsonOk({ plan: data ?? null });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorCapture("admin.plans.patch", async () => {
    const rl = await rateLimit(req, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = await req.json().catch(() => null);
    const parsed = planPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const p = parsed.data;
    const patch: Record<string, unknown> = {};
    if (p.name !== undefined) patch.name = p.name;
    if (p.price_cents !== undefined) patch.price_cents = p.price_cents;
    if (p.currency !== undefined) patch.currency = p.currency;
    if (p.trial_days !== undefined) patch.trial_days = p.trial_days;
    if (p.sort_order !== undefined) patch.sort_order = p.sort_order;
    if (p.active !== undefined) patch.active = p.active;
    if (p.limits !== undefined) patch.limits = p.limits;
    if (p.features !== undefined) patch.features = p.features;

    const { data, error } = await auth.supabase.from("plans").update(patch as never).eq("id", p.id).select("*").single();
    if (error) return jsonError(502, "plan_update_failed");
    await writeAudit({
      actorId: auth.admin.id,
      action: "plan.change",
      targetType: "plan",
      targetId: p.id,
      metadata: { action: "update" },
    });
    return jsonOk({ plan: data ?? null });
  });
}

export async function DELETE(req: NextRequest) {
  return withErrorCapture("admin.plans.delete", async () => {
    const rl = await rateLimit(req, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !uuidSchema.safeParse(id).success) return jsonError(400, "bad_request");
    const { error } = await auth.supabase.from("plans").delete().eq("id", id);
    if (error) return jsonError(409, "plan_delete_failed");
    await writeAudit({
      actorId: auth.admin.id,
      action: "plan.change",
      targetType: "plan",
      targetId: id,
      metadata: { action: "delete" },
    });
    return jsonOk({ ok: true });
  });
}