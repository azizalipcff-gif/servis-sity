import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

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

type Body = {
  id?: string;
  plan_key?: string;
  interval?: string;
  name?: string;
  price_cents?: number;
  currency?: string;
  trial_days?: number;
  sort_order?: number;
  active?: boolean;
  limits?: Record<string, unknown>;
  features?: unknown;
};

export async function POST(req: NextRequest) {
  return withErrorCapture("admin.plans.post", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.plan_key || !body.interval || !body.name)
      return jsonError(400, "bad_request");

    const { data, error } = await auth.supabase
      .from("plans")
      .insert({
        plan_key: body.plan_key,
        interval: body.interval,
        name: body.name,
        price_cents: body.price_cents ?? 0,
        currency: body.currency ?? "MAD",
        trial_days: body.trial_days ?? 0,
        sort_order: body.sort_order ?? 99,
        active: body.active ?? true,
        limits: body.limits ?? ({} as Record<string, unknown>),
        features: (body.features ?? []) as unknown as Record<string, unknown>,
      })
      .select("*")
      .single();
    void error;
    return jsonOk({ plan: data ?? null });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorCapture("admin.plans.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.id) return jsonError(400, "bad_request");

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.price_cents !== undefined) patch.price_cents = body.price_cents;
    if (body.currency !== undefined) patch.currency = body.currency;
    if (body.trial_days !== undefined) patch.trial_days = body.trial_days;
    if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
    if (body.active !== undefined) patch.active = body.active;
    if (body.limits !== undefined) patch.limits = body.limits;
    if (body.features !== undefined) patch.features = body.features;

    const { data } = await auth.supabase.from("plans").update(patch as never).eq("id", body.id).select("*").single();
    return jsonOk({ plan: data ?? null });
  });
}

export async function DELETE(req: NextRequest) {
  return withErrorCapture("admin.plans.delete", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError(400, "bad_request");
    await auth.supabase.from("plans").delete().eq("id", id);
    return jsonOk({ ok: true });
  });
}