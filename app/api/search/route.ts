import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSearchParams } from "@/lib/search/url";
import { rankBusinesses, haversineKm } from "@/lib/search/ranking";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture } from "@/lib/security/http";
import type {
  SearchBusiness,
  SearchResponse,
} from "@/lib/search/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Candidate pool cap. Ranking + price/open-now filtering happen in memory on
 * the server (never client-side) so "recommended" ordering can't be gamed.
 * At larger data volumes swap in a Postgres ranking function + index; the
 * contract of this endpoint stays the same (see MASTER_PROMPT_V2 §8).
 */
const RANK_POOL_CAP = 600;

export async function GET(request: Request) {
  return withErrorCapture("search.get", async () => {
    const rl = rateLimit(request, { key: "search:get", limit: 300, windowMs: 60_000 });
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

  let builder = supabase
    .from("businesses")
    .select("*, categories(slug, icon, name_ar, name_fr, name_en)")
    .eq("status", "approved")
    .limit(RANK_POOL_CAP);

  if (params.q) {
    builder = builder.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%`);
  }
  if (params.city) builder = builder.eq("city", params.city);
  if (params.category) builder = builder.eq("categories.slug", params.category);
  if (params.minRating > 0) builder = builder.gte("rating_avg", params.minRating);
  if (params.verifiedOnly) builder = builder.eq("verified", true);
  if (params.premiumOnly) builder = builder.neq("plan", "free");

  const { data, error } = await builder;

  if (error || !data) {
    return NextResponse.json<SearchResponse>({
      items: [],
      total: 0,
      offset: params.offset,
      limit: params.limit,
      hasMore: false,
      error: true,
    });
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

  const total = pool.length;
  const ranked = rankBusinesses(pool, params.sort, params.lat, params.lng);
  const page = ranked.slice(params.offset, params.offset + params.limit);

  const items: SearchBusiness[] = page.map((b) => ({
    ...b,
    starting_price: prices.get(b.id) ?? null,
  }));

  return NextResponse.json<SearchResponse>({
    items,
    total,
    offset: params.offset,
    limit: params.limit,
    hasMore: params.offset + page.length < total,
  });
}

async function getStartingPrices(
  items: SearchBusiness[],
  supabase: Awaited<ReturnType<typeof createClient>>,
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
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SearchBusiness[]> {
  if (items.length === 0) return items;
  const { data, error } = await supabase
    .from("business_hours")
    .select("business_id, day_of_week, open_time, close_time, is_closed")
    .in("business_id", items.map((b) => b.id));

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