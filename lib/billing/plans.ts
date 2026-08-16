import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Plan, PlanType } from "@/lib/supabase/database.types";
import type { Interval } from "./money";

export type PlanRow = Plan;

export const getPlans = cache(async (): Promise<PlanRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as PlanRow[];
});

export async function getPlan(
  planKey: string,
  interval: Interval,
): Promise<PlanRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("plan_key", planKey)
    .eq("interval", interval)
    .eq("active", true)
    .maybeSingle();
  return (data as PlanRow) ?? null;
}

export function planTypeFor(key: string): PlanType {
  if (key === "premium" || key === "enterprise" || key === "pro") return key as PlanType;
  return "free";
}

export function isPaidPlan(key: string): boolean {
  return key === "premium" || key === "enterprise" || key === "pro";
}

/** Group catalogue by plan key for the pricing page. */
export function groupPlans(plans: PlanRow[]): Record<string, PlanRow[]> {
  const out: Record<string, PlanRow[]> = {};
  for (const p of plans) {
    (out[p.plan_key] ??= []).push(p);
  }
  return out;
}