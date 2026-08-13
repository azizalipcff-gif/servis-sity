import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSearchParams } from "@/lib/search/url";
import {
  rankItems,
  haversineKm,
} from "@/lib/search/ranking";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture } from "@/lib/security/http";
import type {
  SearchBusiness,
  SearchItem,
  SearchParams,
  SearchProductItem,
  SearchResponse,
  SearchSeller,
  SearchServiceItem,
} from "@/lib/search/types";
import type { Category } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Candidate pool cap per catalog. Ranking + price/open-now filtering happen in
 * memory on the server (never client-side) so "recommended" ordering can't be
 * gamed. At larger data volumes swap in a Postgres ranking function; the
 * contract of this endpoint stays the same (see MASTER_PROMPT_V2 §8).
 */
const RANK_POOL_CAP = 600;

export async function GET(request: Request) {
  return withErrorCapture("search.get", async () => {
    const rl = rateLimit(request, {
      key: "search:get",
      limit: 300,
      windowMs: 60_000,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    return handleSearch(request);
  });
}

async function handleSearch(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const params = parseSearchParams(
    Object.fromEntries(url.searchParams.entries()),
  );

  const supabase = await createClient();
  const categories = await loadCategories(supabase);

  const items: SearchItem[] = [];

  const includeBusiness =
    params.type === "business" || params.type === "all";
  const includeService =
    params.type === "service" || params.type === "all";
  const includeProduct =
    params.type === "product" || params.type === "all";

  if (includeBusiness) {
    const { items: biz } = await searchBusinesses(
      params,
      supabase,
      categories,
    );
    items.push(...biz);
  }
  if (includeService) {
    items.push(...(await searchServices(params, supabase, categories)));
  }
  if (includeProduct) {
    items.push(...(await searchProducts(params, supabase, categories)));
  }

  // "Open now" only has meaning for businesses — when it's on, keep only
  // businesses (already open-filtered) and drop services/products entirely.
  if (params.openNowOnly) {
    filterInPlace(items, (i) => i.kind === "business");
  }

  const ranked = rankItems(items, params.sort, params.lat, params.lng);
  const page = ranked.slice(params.offset, params.offset + params.limit);

  return NextResponse.json<SearchResponse>({
    items: page,
    total: items.length,
    offset: params.offset,
    limit: params.limit,
    hasMore: params.offset + page.length < items.length,
    type: params.type,
  });
}

function filterInPlace<T>(arr: T[], predicate: (item: T) => boolean): void {
  let write = 0;
  for (let read = 0; read < arr.length; read += 1) {
    if (predicate(arr[read])) arr[write++] = arr[read];
  }
  arr.length = write;
}

/* ==========================================================================
 * Business catalog (unchanged behavior)
 * ========================================================================== */

async function searchBusinesses(
  params: SearchParams,
  supabase: Supabase,
  categories: Map<string, Category>,
): Promise<{ items: (SearchBusiness & { kind: "business" })[] }> {
  let builder = supabase
    .from("businesses")
    .select(
      "*, categories!businesses_category_id_fkey(slug, icon, name_ar, name_fr, name_en)",
    )
    .eq("status", "approved")
    .limit(RANK_POOL_CAP);

  if (params.q) {
    builder = builder.or(
      `name.ilike.%${params.q}%,description.ilike.%${params.q}%`,
    );
  }
  if (params.city) builder = builder.eq("city", params.city);
  if (params.category) {
    const categoryId = bySlug(categories, params.category);
    if (categoryId) builder = builder.eq("category_id", categoryId);
    else return { items: [] };
  }
  if (params.minRating > 0) builder = builder.gte("rating_avg", params.minRating);
  if (params.verifiedOnly) builder = builder.eq("verified", true);
  if (params.premiumOnly) builder = builder.neq("plan", "free");

  const { data, error } = await builder;

  if (error || !data) {
    return { items: [] };
  }

  let pool = data as unknown as SearchBusiness[];

  // Distance: attach when user sent coordinates.
  if (params.lat != null && params.lng != null) {
    pool = pool.map((b) => ({
      ...b,
      distance_km: haversineKm(params.lat!, params.lng!, b.lat, b.lng),
    }));
  }

  // Starting prices are needed for price filtering and for the cards.
  const prices = await getStartingPrices(pool, supabase);

  // Price band filter.
  if (params.minPrice != null || params.maxPrice != null) {
    pool = pool.filter((b) => {
      const p = prices.get(b.id);
      if (p == null) return false;
      if (params.minPrice != null && p < params.minPrice) return false;
      if (params.maxPrice != null && p > params.maxPrice) return false;
      return true;
    });
  }

  // "Open now" requires working hours — only queried when requested.
  if (params.openNowOnly) {
    pool = await filterOpenNow(pool, supabase);
  }

  const items = pool.map((b) => ({
    ...b,
    kind: "business" as const,
    starting_price: prices.get(b.id) ?? null,
  }));

  return { items };
}

async function getStartingPrices(
  items: SearchBusiness[],
  supabase: Supabase,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (items.length === 0) return map;
  const { data } = await supabase
    .from("services")
    .select("business_id, price")
    .in("business_id", items.map((b) => b.id));
  for (const s of data ?? []) {
    if (s.price == null) continue;
    const cur = map.get(s.business_id);
    if (cur == null || s.price < cur) map.set(s.business_id, s.price);
  }
  return map;
}

async function filterOpenNow(
  items: SearchBusiness[],
  supabase: Supabase,
): Promise<SearchBusiness[]> {
  const { data, error } = await supabase
    .from("business_hours")
    .select("business_id, day_of_week, open_time, close_time, is_closed")
    .in(
      "business_id",
      items.map((b) => b.id),
    );

  if (error || !data) return items.filter(() => false);

  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const byBiz = new Map<string, typeof data>();
  for (const h of data) {
    const arr = byBiz.get(h.business_id) ?? [];
    arr.push(h);
    byBiz.set(h.business_id, arr);
  }

  const isOpen = (businessId: string): boolean => {
    const slots = byBiz.get(businessId);
    const today = slots?.find((h) => h.day_of_week === day);
    if (!today || today.is_closed || !today.open_time || !today.close_time) {
      return false;
    }
    const open = toMinutes(today.open_time) - 30;
    const close = toMinutes(today.close_time);
    return minutes >= open && minutes <= close;
  };

  return items.map((b) => ({ ...b, open_now: isOpen(b.id) }));
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map((n) => Number(n));
  return (h ?? 0) * 60 + (m ?? 0);
}

/* ==========================================================================
 * Service catalog
 * ========================================================================== */

const SERVICE_SELECT =
  "id, name, price, duration_minutes, photo_url, description, updated_at, business:businesses(id, name, slug, logo_url, city, verified, rating_avg, reviews_count, plan, category_id)";

async function searchServices(
  params: SearchParams,
  supabase: Supabase,
  categories: Map<string, Category>,
): Promise<SearchServiceItem[]> {
  let builder = supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("status", "published")
    .limit(RANK_POOL_CAP);

  if (params.q) {
    builder = builder.or(
      `name.ilike.%${params.q}%,description.ilike.%${params.q}%`,
    );
  }
  if (params.category) {
    const categoryId = bySlug(categories, params.category);
    if (!categoryId) return [];
    builder = builder.eq("business.category_id", categoryId);
  }
  if (params.city) builder = builder.eq("business.city", params.city);
  if (params.verifiedOnly) builder = builder.eq("business.verified", true);
  if (params.premiumOnly) builder = builder.neq("business.plan", "free");
  if (params.minRating > 0) {
    builder = builder.gte("business.rating_avg", params.minRating);
  }
  if (params.minPrice != null) builder = builder.gte("price", params.minPrice);
  if (params.maxPrice != null) builder = builder.lte("price", params.maxPrice);

  const { data, error } = await builder;
  if (error || !data) return [];

  return data
    .filter((s) => s.business && s.business.rating_avg != null)
    .map((s) => ({
      kind: "service" as const,
      id: s.id,
      name: s.name,
      slug: null,
      price: s.price,
      duration_minutes: s.duration_minutes,
      photo_url: s.photo_url,
      description: s.description,
      updated_at: s.updated_at,
      categories: toCategory(
        categories.get(s.business.category_id),
      ),
      business: toSeller(s.business),
      sellerName: s.business.name ?? "",
    }));
}

/* ==========================================================================
 * Product catalog
 * ========================================================================== */

const PRODUCT_SELECT =
  "id, slug, name, price, compare_at_price, stock, images, description, category_id, created_at, updated_at, business:businesses(id, name, slug, logo_url, city, verified, rating_avg, reviews_count, plan)";

async function searchProducts(
  params: SearchParams,
  supabase: Supabase,
  categories: Map<string, Category>,
): Promise<SearchProductItem[]> {
  let builder = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "published")
    .limit(RANK_POOL_CAP);

  if (params.q) {
    builder = builder.or(
      `name.ilike.%${params.q}%,description.ilike.%${params.q}%`,
    );
  }
  if (params.category) {
    const categoryId = bySlug(categories, params.category);
    if (!categoryId) return [];
    builder = builder.eq("category_id", categoryId);
  }
  if (params.city) builder = builder.eq("business.city", params.city);
  if (params.verifiedOnly) builder = builder.eq("business.verified", true);
  if (params.premiumOnly) builder = builder.neq("business.plan", "free");
  if (params.minRating > 0) {
    builder = builder.gte("business.rating_avg", params.minRating);
  }
  if (params.minPrice != null) builder = builder.gte("price", params.minPrice);
  if (params.maxPrice != null) builder = builder.lte("price", params.maxPrice);

  const { data, error } = await builder;
  if (error || !data) return [];

  return data
    .filter((p) => p.business)
    .map((p) => ({
      kind: "product" as const,
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      compare_at_price: p.compare_at_price,
      stock: p.stock,
      images: p.images ?? [],
      description: p.description,
      created_at: p.created_at,
      updated_at: p.updated_at,
      categories: toCategory(
        p.category_id ? categories.get(p.category_id) : undefined,
      ),
      business: toSeller(p.business),
      sellerName: p.business.name ?? "",
    }));
}

/* ==========================================================================
 * Normalizers
 * ========================================================================== */

async function loadCategories(
  supabase: Supabase,
): Promise<Map<string, Category>> {
  const map = new Map<string, Category>();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, icon, image_url, name_ar, name_fr, name_en");
  for (const c of data ?? []) map.set(c.id, c as Category);
  return map;
}

function bySlug(categories: Map<string, Category>, slug: string): string | null {
  for (const c of categories.values()) if (c.slug === slug) return c.id;
  return null;
}

function toCategory(
  category: Category | undefined,
): SearchServiceItem["categories"] {
  if (!category) return null;
  return {
    slug: category.slug,
    icon: category.icon,
    name_ar: category.name_ar,
    name_fr: category.name_fr,
    name_en: category.name_en,
  };
}

function toSeller(
  b: {
    name: string | null;
    slug: string | null;
    logo_url: string | null;
    verified: boolean;
    city: string | null;
    rating_avg: number | null;
    reviews_count: number | null;
    plan: string;
  },
): SearchSeller {
  return {
    name: b.name ?? "",
    slug: b.slug,
    logo_url: b.logo_url,
    verified: b.verified,
    city: b.city,
    rating_avg: b.rating_avg ?? 0,
    reviews_count: b.reviews_count ?? 0,
    plan: b.plan,
  };
}