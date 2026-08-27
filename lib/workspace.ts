import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/user";
import { listConversations } from "@/lib/messenger";
import { deriveWorkspaceState } from "@/lib/workspace/state";
import type { User } from "@supabase/supabase-js";
import type {
  Profile,
  Business,
  Category,
  Service,
  Product,
} from "@/lib/supabase/database.types";

export type WorkspaceBusiness = Business & {
  categories: Pick<Category, "slug" | "name_ar" | "name_fr" | "name_en"> | null;
};

export type WorkspaceService = Service & {
  business: {
    id: string;
    name: string | null;
    slug: string | null;
    logo_url: string | null;
    verification_status: string | null;
    verified: boolean;
  } | null;
};

export type WorkspaceProduct = Product & {
  business: {
    id: string;
    name: string | null;
    slug: string | null;
    logo_url: string | null;
  } | null;
};

export type BusinessSummary = WorkspaceBusiness & {
  servicesCount: number;
  productsCount: number;
};

export type WorkspaceData = {
  profile: Profile | null;
  businesses: BusinessSummary[];
  services: WorkspaceService[];
  products: WorkspaceProduct[];
  favoritesCount: number;
  unreadMessages: number;
};

/** The canonical, cached picture of the workspace: who the user is, which
 * businesses they own, and whether that query failed — so pages can render a
 * retry state instead of a fabricated "empty". */
export type WorkspaceState = {
  user: User | null;
  businesses: WorkspaceBusiness[];
  hasBusiness: boolean;
  error: string | null;
};

const BUSINESS_SELECT =
  "*, categories!businesses_category_id_fkey(slug, name_ar, name_fr, name_en)";

const EMPTY_STATE: WorkspaceState = {
  user: null,
  businesses: [],
  hasBusiness: false,
  error: null,
};

/**
 * Single fetch per request of everything the workspace needs to know about the
 * current user. Cached with React's `cache`, so the layout, overview, services,
 * products and business pages all agree on one state.
 */
export const getWorkspaceState = cache(async (): Promise<WorkspaceState> => {
  const user = await getCurrentUser();
  if (!user) return EMPTY_STATE;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(BUSINESS_SELECT)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  console.log("[PROFILE BUSINESS DEBUG]", {
    userId: user.id,
    returnedCount: (data ?? []).length,
    returnedOwnerIds: (data ?? []).map((b) => (b as { owner_id?: string }).owner_id),
    error: error?.message ?? null,
  });

  // Canonical ownership derivation: only rows where owner_id === auth.uid()
  // count (defense in depth over the RLS query filter). A query error is
  // surfaced as such and never as "no business".
  const ownership = deriveWorkspaceState({
    userId: user.id,
    businesses: (data ?? []) as WorkspaceBusiness[],
    error: error?.message ?? null,
  });

  return {
    user,
    businesses: ownership.businesses,
    hasBusiness: ownership.hasBusiness,
    error: ownership.error,
  };
});

/** Everything the profile workspace pages render, derived from cached state. */
export async function getWorkspaceData(state: WorkspaceState): Promise<WorkspaceData> {
  const supabase = await createClient();

  const profile = await getCurrentProfile();

  const empty: WorkspaceData = {
    profile,
    businesses: [],
    services: [],
    products: [],
    favoritesCount: 0,
    unreadMessages: 0,
  };

  const businessIds = state.businesses.map((b) => b.id);
  if (businessIds.length === 0) {
    empty.businesses = state.businesses.map((b) => ({
      ...b,
      servicesCount: 0,
      productsCount: 0,
    }));
    return empty;
  }

  const [servicesResult, productsResult, favoritesResult, conversations] = await Promise.all([
    supabase
      .from("services")
      .select(
        "*, business:businesses(id, name, slug, logo_url, verification_status, verified)",
      )
      .in("business_id", businessIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("products")
      .select("*, business:businesses(id, name, slug, logo_url)")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", state.user?.id ?? ""),
    listConversations(supabase, state.user?.id ?? "", false),
  ]);

  const services = (servicesResult.data ?? []) as WorkspaceService[];
  const products = (productsResult.data ?? []) as WorkspaceProduct[];

  const servicesByBusiness = new Map<string, number>();
  for (const s of services) {
    servicesByBusiness.set(s.business_id, (servicesByBusiness.get(s.business_id) ?? 0) + 1);
  }
  const productsByBusiness = new Map<string, number>();
  for (const p of products) {
    productsByBusiness.set(p.business_id, (productsByBusiness.get(p.business_id) ?? 0) + 1);
  }

  const businesses: BusinessSummary[] = state.businesses.map((b) => ({
    ...b,
    servicesCount: servicesByBusiness.get(b.id) ?? 0,
    productsCount: productsByBusiness.get(b.id) ?? 0,
  }));

  return {
    profile,
    businesses,
    services,
    products,
    favoritesCount: favoritesResult.count ?? 0,
    unreadMessages: conversations.reduce((acc, c) => acc + (c.unread ?? 0), 0),
  };
}

const COMPLETION_TOTAL = 10;

/**
 * Real completion score: how many identity fields the user has filled in.
 * Purely presentational — never a fabricated number.
 */
export function profileCompletion(profile: Profile | null): {
  done: number;
  total: number;
  pct: number;
} {
  if (!profile) return { done: 0, total: COMPLETION_TOTAL, pct: 0 };
  const checks = [
    Boolean(profile.avatar_url),
    Boolean(profile.bio),
    Boolean(profile.city),
    Boolean(profile.phone),
    Boolean(profile.website),
    Boolean(profile.languages),
    Boolean(profile.skills),
    Boolean(profile.experience),
    Boolean(profile.whatsapp),
    Boolean(profile.facebook || profile.instagram || profile.tiktok || profile.linkedin),
  ];
  const done = checks.filter(Boolean).length;
  return {
    done,
    total: COMPLETION_TOTAL,
    pct: Math.round((done / COMPLETION_TOTAL) * 100),
  };
}

export { statusTone } from "@/lib/status";