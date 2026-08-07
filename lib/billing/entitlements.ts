import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Entitlements = {
  planKey: string;
  businessQuota: number | null;
  productLimit: number | null; // null => unlimited
  serviceLimit: number | null;
  galleryLimit: number | null;
  storageMb: number;
  messenger: boolean;
  analytics: boolean;
  prioritySearch: boolean;
  premiumBadge: boolean;
  verifiedBadge: boolean;
  featured: boolean;
  ai: boolean;
  featuredMonthly: number;
  support: "community" | "priority" | "dedicated";
};

const DEFAULT_LIMITS: Record<string, Partial<Entitlements>> = {
  free: {
    businessQuota: 0,
    productLimit: 5,
    serviceLimit: 5,
    galleryLimit: 5,
    storageMb: 50,
    messenger: false,
    analytics: false,
    prioritySearch: false,
    premiumBadge: false,
    verifiedBadge: false,
    featured: false,
    ai: false,
    featuredMonthly: 0,
    support: "community",
  },
  premium: {
    businessQuota: 1,
    productLimit: 50,
    serviceLimit: 20,
    galleryLimit: 50,
    storageMb: 512,
    messenger: true,
    analytics: true,
    prioritySearch: true,
    premiumBadge: true,
    verifiedBadge: true,
    featured: true,
    ai: true,
    featuredMonthly: 1,
    support: "priority",
  },
  enterprise: {
    businessQuota: 3,
    productLimit: null,
    serviceLimit: null,
    galleryLimit: null,
    storageMb: 2048,
    messenger: true,
    analytics: true,
    prioritySearch: true,
    premiumBadge: true,
    verifiedBadge: true,
    featured: true,
    ai: true,
    featuredMonthly: 3,
    support: "dedicated",
  },
};

export function emptyEntitlements(planKey = "free"): Entitlements {
  const d = DEFAULT_LIMITS[planKey] ?? DEFAULT_LIMITS.free;
  return {
    planKey,
    businessQuota: d.businessQuota ?? 0,
    productLimit: d.productLimit ?? null,
    serviceLimit: d.serviceLimit ?? null,
    galleryLimit: d.galleryLimit ?? null,
    storageMb: d.storageMb ?? 0,
    messenger: d.messenger ?? false,
    analytics: d.analytics ?? false,
    prioritySearch: d.prioritySearch ?? false,
    premiumBadge: d.premiumBadge ?? false,
    verifiedBadge: d.verifiedBadge ?? false,
    featured: d.featured ?? false,
    ai: d.ai ?? false,
    featuredMonthly: d.featuredMonthly ?? 0,
    support: d.support ?? "community",
  };
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBool(v: unknown): boolean {
  return v === true || v === "true";
}

function toSupport(v: unknown): Entitlements["support"] {
  return v === "priority" || v === "dedicated" ? v : "community";
}

/** Derive entitlements from a plans row (limits/features jsonb). */
export function entitlementsFromPlan(planKey: string, limits?: unknown, features?: unknown): Entitlements {
  const base = emptyEntitlements(planKey);
  const l = (limits ?? {}) as Record<string, unknown>;
  const f = (features ?? {}) as Record<string, unknown>;
  const merged = {
    ...base,
    businessQuota: toNum(l.business),
    productLimit: toNum(l.products) ?? base.productLimit,
    serviceLimit: toNum(l.services) ?? base.serviceLimit,
    galleryLimit: toNum(l.gallery) ?? base.galleryLimit,
    storageMb: toNum(l.storage_mb) ?? base.storageMb,
    messenger: toBool(l.messenger ?? f.messenger) || base.messenger,
    analytics: toBool(l.analytics ?? f.analytics) || base.analytics,
    prioritySearch: toBool(l.priority_search ?? f.prioritySearch) || base.prioritySearch,
    premiumBadge: toBool(l.premium_badge ?? f.premiumBadge) || base.premiumBadge,
    verifiedBadge: toBool(l.verified_badge ?? f.verifiedBadge) || base.verifiedBadge,
    featured: toBool(l.featured ?? f.featured) || base.featured,
    ai: toBool(l.ai ?? f.ai) || base.ai,
    featuredMonthly: toNum(l.featured_monthly) ?? base.featuredMonthly,
    support: toSupport(l.support ?? f.support) || base.support,
  };
  return { ...merged };
}

export type ResolvedEntitlements = { planKey: string; entitlements: Entitlements };

export const getBusinessEntitlements = cache(
  async (businessId: string): Promise<ResolvedEntitlements> => {
    const supabase = await createClient();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan,plan_key,status,cancelled_at")
      .eq("business_id", businessId)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    const planKey = sub?.plan_key ?? sub?.plan ?? "free";
    if (planKey === "free") {
      return { planKey: "free", entitlements: emptyEntitlements("free") };
    }

    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("plan_key", planKey)
      .order("interval", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (plan) {
      return {
        planKey,
        entitlements: entitlementsFromPlan(planKey, plan.limits, plan.features),
      };
    }
    return { planKey, entitlements: emptyEntitlements(planKey) };
  },
);