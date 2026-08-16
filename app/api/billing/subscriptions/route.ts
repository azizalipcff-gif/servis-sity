import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { getMyBusiness } from "@/lib/queries";
import { getPlan } from "@/lib/billing/plans";
import { getCurrentSubscription } from "@/lib/billing/subscription";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return withErrorCapture("billing.subscriptions", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const business = await getMyBusiness(user.id);
    if (!business) return jsonOk({ business: null, subscriptions: [], invoices: [], payments: [] });

    const [subs, invoices, payments, txs, currentRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("invoices")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("payments")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("transactions")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(10),
      getCurrentSubscription(supabase, business.id),
    ]);

    const current = currentRes.subscription as {
      plan_key: string | null;
      plan: string | null;
      interval: string | null;
      status: string | null;
      started_at: string | null;
      expires_at: string | null;
      next_billing_at: string | null;
      auto_renew: boolean;
      lifetime: boolean;
      cancel_at: string | null;
      cancelled_at: string | null;
      paused_at: string | null;
      trial_end_at: string | null;
    } | null;

    const currentPlan = current
      ? await getPlan(
          (current.plan_key ?? current.plan) as Parameters<typeof getPlan>[0],
          (current.interval ?? "monthly") as Parameters<typeof getPlan>[1],
        )
      : null;

    return jsonOk({
      business: { id: business.id, name: business.name, plan: business.plan },
      current,
      state: currentRes.state,
      entitled: currentRes.entitled,
      currentPlan,
      subscriptions: subs.data ?? [],
      invoices: invoices.data ?? [],
      payments: payments.data ?? [],
      transactions: txs.data ?? [],
    });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorCapture("billing.subscriptions.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      businessId?: string;
      action?: "cancel" | "pause" | "resume";
    };
    if (!body.businessId || !body.action) return jsonError(400, "bad_request");

    const { data: owner } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", body.businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!owner) return jsonError(403, "forbidden");

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", body.businessId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub) return jsonError(404, "subscription_not_found");

    const now = new Date().toISOString();
    const update =
      body.action === "cancel"
        ? { cancel_at: now, auto_renew: false }
        : body.action === "pause"
          ? { paused_at: now, status: "paused" }
          : { paused_at: null, status: "active" };

    const { error: subErr } = await supabase
      .from("subscriptions")
      .update(update)
      .eq("id", sub.id);
    if (subErr) return jsonError(500, "update_failed");

    const { error: histErr } = await supabase.from("subscription_history").insert({
      subscription_id: sub.id,
      business_id: body.businessId,
      action:
        body.action === "cancel"
          ? "cancelled"
          : body.action === "pause"
            ? "paused"
            : "resumed",
      plan_to: sub.plan_key,
      interval: sub.interval ?? "monthly",
    });
    if (histErr) return jsonError(500, "history_failed");

    return jsonOk({ ok: true, action: body.action });
  });
}