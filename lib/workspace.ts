import { createClient } from "@/lib/supabase/server";
import { listConversations } from "@/lib/messenger";
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

const BUSINESS_SELECT =
  "*, categories!businesses_category_id_fkey(slug, name_ar, name_fr, name_en)";

/** Everything the profile workspace renders, assembled from the current user's own rows. */
export async function getWorkspaceData(userId: string): Promise<WorkspaceData> {
  const supabase = await createClient();

  const [profileResult, businessResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("businesses")
      .select(BUSINESS_SELECT)
      .eq("owner_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const profile = (profileResult.data as Profile | null) ?? null;
  const rawBusinesses = (businessResult.data ?? []) as WorkspaceBusiness[];

  const empty: WorkspaceData = {
    profile,
    businesses: [],
    services: [],
    products: [],
    favoritesCount: 0,
    unreadMessages: 0,
  };

  const businessIds = rawBusinesses.map((b) => b.id);
  if (businessIds.length === 0) {
    empty.businesses = rawBusinesses.map((b) => ({ ...b, servicesCount: 0, productsCount: 0 }));
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
      .eq("user_id", userId),
    listConversations(supabase, userId, false),
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

  const businesses: BusinessSummary[] = rawBusinesses.map((b) => ({
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

/** Lightweight count of businesses the user owns — used by the shell/header. */
export async function countMyBusinesses(ownerId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);
  return error ? 0 : (count ?? 0);
}