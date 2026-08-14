import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSearchParams } from "@/lib/search/url";
import {
  rankItems,
  haversineKm,
} from "@/lib/search/ranking";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture } from "@/lib/security/http";
import {
  isEmbeddingConfigured,
  generateEmbedding,
  EMBEDDING_DIMENSION,
} from "@/lib/search-quality/embeddings";
import type {
  SearchBusiness,
  SearchItem,
  SearchParams,
  SearchProductItem,
  SearchResponse,
  SearchSeller,
  SearchServiceItem,
} from "@/lib/search/types";
import type { SearchMatchMethod } from "@/lib/search/types";
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

  // Preferred path: hybrid_search RPC (vector + trigram + in-SQL filters).
  // Falls back to the in-memory catalog scan below when the function has not
  // been deployed (migration 0019 not yet applied) or fails.
  const v3 = await searchHybrid(params, supabase, categories);
  const matchMethod: SearchMatchMethod = v3 ? "hybrid" : "legacy";
  const items = v3 ?? (await searchLegacy(params, supabase, categories));

  const ranked = rankItems(items, params.sort, params.lat, params.lng);
  const page = ranked.slice(params.offset, params.offset + params.limit);

  const body: SearchResponse = {
    items: page,
    total: items.length,
    offset: params.offset,
    limit: params.limit,
    hasMore: params.offset + page.length < items.length,
    type: params.type,
    matchMethod,
  };
  // Observability: emit the pipeline tag outside production so operations can
  // confirm which engine served a page without leaking it into production logs.
  if (process.env.NODE_ENV !== "production") {
    body.searchVersion = matchMethod === "hybrid" ? "v4-hybrid" : "v3-legacy";
  }

  return NextResponse.json<SearchResponse>(body);
}

/* ==========================================================================
 * Preferred path — hybrid_search RPC (migration 0019)
 * ========================================================================== */

type HybridRow = {
  kind: "business" | "service" | "product";
  id: string;
  score: number;
  payload: Record<string, unknown>;
};

/**
 * Returns the query embedding as a Postgres vector literal (`[x,y,…]`), or
 * `null` when the provider is unconfigured, the query is empty, or generation
 * fails. Returning `null` keeps the hybrid RPC on its lexical path — semantic
 * search is an additive capability, never a hard dependency.
 */
async function queryEmbeddingOrNull(q: string): Promise<string | null> {
  const text = (q ?? "").trim();
  if (!text || !isEmbeddingConfigured()) return null;
  try {
    const vector = await generateEmbedding(text);
    if (vector.length !== EMBEDDING_DIMENSION) return null;
    return `[${vector.join(",")}]`;
  } catch {
    return null;
  }
}

/**
 * Runs the hybrid_search RPC and maps rows back into `SearchItem`. Returns
 * `null` when the function is unavailable so callers fall back to legacy.
 */
async function searchHybrid(
  params: SearchParams,
  supabase: Supabase,
  categories: Map<string, Category>,
): Promise<SearchItem[] | null> {
  try {
    const client = supabase as unknown as {
      rpc: (
        fn: "hybrid_search",
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const args: Record<string, unknown> = {
      p_query: params.q || null,
      // "Open now" only exists for businesses — legacy behavior kept.
      p_type: params.openNowOnly ? "business" : params.type,
      p_city: params.city || null,
      p_category: params.category || null,
      p_min_rating: params.minRating || 0,
      p_min_price: params.minPrice ?? null,
      p_max_price: params.maxPrice ?? null,
      p_verified: params.verifiedOnly,
      p_premium: params.premiumOnly,
      p_open_now: params.openNowOnly,
      p_limit: RANK_POOL_CAP,
    };

    // Semantic leg: embed the free-text query server-side with the active
    // provider (Ollama). When the provider is not configured or the call fails,
    // the embedding is omitted and the RPC runs its trigram/lexical path —
    // search keeps working, never 500s on AI outages.
    const embedding = await queryEmbeddingOrNull(params.q);
    if (embedding) args.p_embedding = embedding;

    const { data, error } = await client.rpc("hybrid_search", args);
    if (error || !Array.isArray(data)) return null;

    const rows = data as unknown as HybridRow[];
    const bizIds = rows
      .filter((r) => r.kind === "business")
      .map((r) => String(r.payload.id));

    const prices = await getStartingPrices(
      bizIds.map((id) => ({ id }) as SearchBusiness),
      supabase,
    );

    const items: SearchItem[] = rows.map((r) =>
      hybridRowToItem(r, categories, prices),
    );

    if (params.lat != null && params.lng != null) {
      for (const i of items) {
        if (i.kind === "business" && i.lat != null && i.lng != null) {
          (i as SearchBusiness & { kind: "business" }).distance_km =
            haversineKm(params.lat, params.lng, i.lat, i.lng);
        }
      }
    }

    return items;
  } catch {
    return null;
  }
}

function hybridRowToItem(
  row: HybridRow,
  categories: Map<string, Category>,
  prices: Map<string, number>,
): SearchItem {
  const p = row.payload;
  const categoryFor = (id: number | string | null | undefined) =>
    id == null ? null : categories.get(String(id)) ?? null;

  switch (row.kind) {
    case "service": {
      const seller = (p.business ?? {}) as Record<string, unknown>;
      return {
        kind: "service",
        id: String(p.id),
        name: String(p.name ?? ""),
        slug: p.slug != null ? String(p.slug) : null,
        price: toNullableNumber(p.price),
        duration_minutes: toNullableNumber(p.duration_minutes),
        photo_url: p.photo_url != null ? String(p.photo_url) : null,
        description: p.description != null ? String(p.description) : null,
        updated_at: String(p.updated_at ?? ""),
        categories: categoryFor(seller.category_id as string | null),
        business: toSeller(seller),
        sellerName: String(seller.name ?? ""),
      };
    }
    case "product": {
      const seller = (p.business ?? {}) as Record<string, unknown>;
      return {
        kind: "product",
        id: String(p.id),
        slug: String(p.slug ?? p.id),
        name: String(p.name ?? ""),
        price: toNullableNumber(p.price) ?? 0,
        compare_at_price: toNullableNumber(p.compare_at_price),
        stock: Math.max(toNullableNumber(p.stock) ?? 0, 0),
        images: Array.isArray(p.images)
          ? (p.images as string[]).map(String)
          : [],
        description: p.description != null ? String(p.description) : null,
        created_at: String(p.created_at ?? ""),
        updated_at: String(p.updated_at ?? ""),
        categories: categoryFor(p.category_id as string | null),
        business: toSeller(seller),
        sellerName: String(seller.name ?? ""),
      };
    }
    default: {
      const id = String(p.id);
      return {
        ...(p as unknown as SearchBusiness),
        id,
        kind: "business",
        categories: categoryFor(p.category_id as string | null),
        starting_price: prices.get(id) ?? null,
      };
    }
  }
}

function toNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ==========================================================================
 * Legacy path — in-memory catalog scan (unchanged behavior)
 * ========================================================================== */

async function searchLegacy(
  params: SearchParams,
  supabase: Supabase,
  categories: Map<string, Category>,
): Promise<SearchItem[]> {
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

  return items;
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

function toSeller(b: Record<string, unknown>): SearchSeller {
  return {
    name: b.name != null ? String(b.name) : "",
    slug: b.slug != null ? String(b.slug) : null,
    logo_url: b.logo_url != null ? String(b.logo_url) : null,
    verified: Boolean(b.verified),
    city: b.city != null ? String(b.city) : null,
    rating_avg: toNullableNumber(b.rating_avg) ?? 0,
    reviews_count: toNullableNumber(b.reviews_count) ?? 0,
    plan: b.plan != null ? String(b.plan) : "free",
  };
}