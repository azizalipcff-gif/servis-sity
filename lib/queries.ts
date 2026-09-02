import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  createClient,
  createPublicClient,
  createServiceClient,
} from "@/lib/supabase/server";
import type {
  Booking,
  Business,
  Category,
  City,
  Product,
  Profile,
  Report,
  Review,
  Service,
} from "@/lib/supabase/database.types";

export type BusinessWithCategory = Business & {
  categories: Category | null;
  /** Canonical city slug resolved from the cities table (via `city_id`). */
  city_slug?: string | null;
};

export type BusinessDetail = Business & {
  categories: Pick<Category, "slug" | "name_ar" | "name_fr" | "name_en"> | null;
  services: Service[];
  media: { id: string; type: "image" | "video"; url: string }[];
  reviews: (Review & { profile: { full_name: string | null } | null })[];
  hours: { id: string; day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }[];
  /** Canonical city slug resolved from the `cities` table (via `city_id`). */
  city_slug?: string | null;
};

/** City-slug join fragment: resolves the canonical `cities.slug` for a row. */
const CITY_SLUG_JOIN = "cities!businesses_city_id_fkey(slug)";

type WithCityJoin = { cities?: { slug: string | null } | null };

/** Strip the nested `cities` join and expose it as a canonical `city_slug`. */
function attachCitySlug<T extends object>(row: T & WithCityJoin): T & { city_slug: string | null } {
  const { cities, ...rest } = row as T & WithCityJoin & { city_slug?: never };
  return { ...rest, city_slug: cities?.slug ?? null } as T & { city_slug: string | null };
}

type WithSellerCityJoin = {
  business?:
    | (Record<string, unknown> & WithCityJoin)
    | null;
};

/** Attach the canonical `city_slug` onto a nested `business` seller projection. */
function attachSellerCitySlug<T>(row: T): T {
  const seller = (row as WithSellerCityJoin).business;
  if (!seller) return row;
  const { cities, ...business } = seller;
  return {
    ...row,
    business: { ...business, city_slug: cities?.slug ?? null },
  } as T;
}

const SORT_ORDER = { pro: 0, premium: 1, free: 2 } as const;

/**
 * All query helpers catch errors and return empty data so the app can
 * render (with empty states) even before Supabase credentials are set.
 */
export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data;
  },
  ["q:categories"],
  { tags: ["categories"], revalidate: 3600 },
);

export const getCityBySlug = unstable_cache(
  async (slug: string): Promise<City | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  },
  ["q:city-by-slug"],
  { tags: ["cities"], revalidate: 3600 },
);

export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<Category | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  },
  ["q:category-by-slug"],
  { tags: ["categories"], revalidate: 3600 },
);

/** Map category_id -> approved business count (used by marketplace rails). */
export const getCategoryCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("businesses")
      .select("category_id, status")
      .eq("status", "approved");
    if (error || !data) return {};

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
    }
    return counts;
  },
  ["q:category-counts"],
  { tags: ["categories"], revalidate: 300 },
);

export const getFeaturedBusinesses = unstable_cache(
  async (): Promise<BusinessWithCategory[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("businesses")
      .select(`*, categories!businesses_category_id_fkey(*), ${CITY_SLUG_JOIN}`)
      .eq("status", "approved")
      .order("plan", { ascending: true })
      .order("rating_avg", { ascending: false })
      .order("reviews_count", { ascending: false })
      .limit(8);

    if (error || !data) return [];
    return (data ?? []).map(attachCitySlug) as unknown as BusinessWithCategory[];
  },
  ["q:featured-businesses"],
  { tags: ["businesses"], revalidate: 300 },
);

export const getBusinessesByCategory = unstable_cache(
  async (categorySlug: string): Promise<BusinessWithCategory[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("businesses")
      .select(`*, categories!businesses_category_id_fkey!inner(*), ${CITY_SLUG_JOIN}`)
      .eq("status", "approved")
      .eq("categories.slug", categorySlug)
      .order("plan", { ascending: true })
      .order("plan", { ascending: true })
      .order("rating_avg", { ascending: false });

    if (error || !data) return [];
    return (data ?? []).map(attachCitySlug) as unknown as BusinessWithCategory[];
  },
  ["q:businesses-by-category"],
  { tags: ["businesses"], revalidate: 300 },
);

export type BusinessListFilters = {
  query?: string;
  categoryId?: string;
  city?: string;
  verifiedOnly?: boolean;
  sort?: "newest" | "rating" | "reviews";
  limit?: number;
  offset?: number;
};

const BUSINESS_SORT_COLUMNS: Record<
  NonNullable<BusinessListFilters["sort"]>,
  { column: string; ascending: boolean }
> = {
  newest: { column: "created_at", ascending: false },
  rating: { column: "rating_avg", ascending: false },
  reviews: { column: "reviews_count", ascending: false },
};

/** Approved marketplace businesses with a real total count, for the /business catalog. */
export const getPublishedBusinesses = unstable_cache(
  async (
    filters: BusinessListFilters = {},
  ): Promise<{ items: BusinessWithCategory[]; total: number }> => {
    const supabase = createPublicClient();
    const limit = filters.limit ?? 24;
    const offset = filters.offset ?? 0;

    let q = supabase
      .from("businesses")
      .select(`*, categories!businesses_category_id_fkey(*), ${CITY_SLUG_JOIN}`, {
        count: "exact",
      })
      .eq("status", "approved");
    if (filters.query)
      q = q.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
    if (filters.city) {
      // Canonical city filtering uses cities.slug -> city_id. Keep the legacy
      // text column as a fallback for older listings that predate city_id.
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .eq("slug", filters.city)
        .maybeSingle();
      if (cityRow?.id) {
        q = q.or(`city_id.eq.${cityRow.id},city.eq.${filters.city}`);
      } else {
        q = q.eq("city", filters.city);
      }
    }
    // `verified` is an administrative state, not a discovery-quality filter.\n    // Keep the filter only when the UI explicitly requests it.\n    if (filters.verifiedOnly) q = q.eq("verified", true);

    const sort = BUSINESS_SORT_COLUMNS[filters.sort ?? "newest"];
    q = q.order(sort.column, { ascending: sort.ascending });

    const { data, error, count } = await q.range(offset, offset + limit - 1);
    if (error || !data) return { items: [], total: 0 };
    return {
      items: (data ?? []).map(attachCitySlug) as unknown as BusinessWithCategory[],
      total: count ?? 0,
    };
  },
  ["q:published-businesses"],
  { tags: ["businesses"], revalidate: 120 },
);

type JoinedBusiness = Business & {
  categories: Pick<Category, "slug" | "name_ar" | "name_fr" | "name_en"> | null;
};

export const getBusinessBySlug = unstable_cache(
  async (slug: string): Promise<BusinessDetail | null> => {
    const supabase = createPublicClient();

    const businessResult = (await supabase
      .from("businesses")
      .select(`*, categories!businesses_category_id_fkey(slug, name_ar, name_fr, name_en), ${CITY_SLUG_JOIN}`)
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle()) as unknown as {
      data: (JoinedBusiness & WithCityJoin) | null;
      error: { message: string } | null;
    };

    const business = businessResult.data;
    if (!business) return null;

    const [services, media, reviews, hours] = await Promise.all([
    supabase
      .from("services")
.select("id, business_id, name, price, duration_minutes, description, photo_url, status, gallery, featured, updated_at, category_id, tags, old_price")
      .eq("business_id", business.id)
      .eq("status", "published")
      .order("updated_at", { ascending: true }),
      supabase
        .from("media")
        .select("id, business_id, type, url, sort_order")
        .eq("business_id", business.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("reviews")
        .select("*, profile:profiles(full_name)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("business_hours")
        .select("id, business_id, day_of_week, open_time, close_time, is_closed")
        .eq("business_id", business.id)
        .order("day_of_week", { ascending: true }),
    ]);

    return {
      ...attachCitySlug(business),
      services: (services.data ?? []) as BusinessDetail["services"],
      media: (media.data ?? []) as BusinessDetail["media"],
      hours: hours.data ?? [],
      reviews: (reviews.data ?? []) as BusinessDetail["reviews"],
    };
  },
  ["q:business-by-slug"],
  { tags: ["businesses"], revalidate: 300 },
);

export async function getBusinessCount() {
  const supabase = createPublicClient();
  const { count, error } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  return error ? 0 : (count ?? 0);
}

export async function getPublishedServicesCount() {
  const supabase = createPublicClient();
  const { data: approvedBusinesses, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("status", "approved");
  const businessIds = (approvedBusinesses ?? []).map((business) => business.id);
  if (businessError || businessIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .in("business_id", businessIds);
  return error ? 0 : (count ?? 0);
}

export async function getPublishedProductsCount() {
  const supabase = createPublicClient();
  const { data: approvedBusinesses, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("status", "approved");
  const businessIds = (approvedBusinesses ?? []).map((business) => business.id);
  if (businessError || businessIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .in("business_id", businessIds);
  return error ? 0 : (count ?? 0);
}

export const getSitemapBusinesses = unstable_cache(
  async (): Promise<
    (Pick<Business, "slug" | "city" | "city_id" | "last_updated_at"> & {
      city_slug: string | null;
    })[]
  > => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("businesses")
      .select(`slug, city, city_id, last_updated_at, ${CITY_SLUG_JOIN}`)
      .eq("status", "approved");
    if (error || !data) return [];
    return (data ?? []).map(attachCitySlug) as unknown as (Pick<
      Business,
      "slug" | "city" | "city_id" | "last_updated_at"
    > & { city_slug: string | null })[];
  },
  ["q:sitemap-businesses"],
  { tags: ["businesses"], revalidate: 3600 },
);

export const getSitemapProducts = unstable_cache(
  async (): Promise<Pick<Product, "slug" | "updated_at">[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error || !data) return [];
    return data;
  },
  ["q:sitemap-products"],
  { tags: ["products"], revalidate: 3600 },
);

export const getSitemapServices = unstable_cache(
  async (): Promise<Pick<Service, "id" | "updated_at">[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("services")
      .select("id, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error || !data) return [];
    return data;
  },
  ["q:sitemap-services"],
  { tags: ["services"], revalidate: 3600 },
);

export async function getBookingsForOwner(businessId: string) {
  const supabase = await createClient();
  const result = (await supabase
    .from("bookings")
    .select("*, services(name)")
    .eq("business_id", businessId)
    .order("booking_date", { ascending: true })) as unknown as {
    data: (Booking & { services: { name: string } | null })[] | null;
    error: unknown;
  };

  if (result.error || !result.data) return [];
  return result.data;
}

export async function getMyBusiness(ownerId: string): Promise<BusinessDetail | null> {
  const supabase = await createClient();

  const businessResult = (await supabase
    .from("businesses")
    .select(`*, categories!businesses_category_id_fkey(slug, name_ar, name_fr, name_en), ${CITY_SLUG_JOIN}`)
    .eq("owner_id", ownerId)
    .maybeSingle()) as unknown as {
    data: (JoinedBusiness & WithCityJoin) | null;
    error: { message: string } | null;
  };

  const business = businessResult.data;
  if (!business) return null;

  const [services, media, hours, reviews] = await Promise.all([
      supabase
        .from("services")
.select("id, business_id, name, price, category_id, tags, old_price, duration_minutes, description, photo_url, status, gallery, featured, updated_at")
        .eq("business_id", business.id)
        .order("updated_at", { ascending: true }),
      supabase
        .from("media")
        .select("id, business_id, type, url, sort_order")
        .eq("business_id", business.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("business_hours")
        .select("id, business_id, day_of_week, open_time, close_time, is_closed")
        .eq("business_id", business.id)
        .order("day_of_week", { ascending: true }),
      supabase
        .from("reviews")
        .select("*, profile:profiles(full_name)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false }),
    ]);

    return {
      ...attachCitySlug(business),
      services: (services.data ?? []) as BusinessDetail["services"],
      media: (media.data ?? []) as BusinessDetail["media"],
      hours: hours.data ?? [],
      reviews: (reviews.data ?? []) as BusinessDetail["reviews"],
    };
  }

export { SORT_ORDER };

export async function getProductsForBusiness(
  businessId: string,
): Promise<ProductWithBusiness[]> {
  // Session client (NOT the anonymous public client): RLS `products_select_public`
  // only returns published rows to anonymous callers, which would hide the
  // owner's own draft/archived products from their dashboard. As the owner we
  // must see every status (including `archived`) so it can be deleted. Public
  // business pages are unaffected — anonymous visitors still only see published.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `*, business:businesses(id, name, slug, logo_url, cover_url, city, verified, whatsapp, whatsapp_url, whatsapp_enabled, phone, owner_id, rating_avg, reviews_count, plan)`,
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown[]).map(attachSellerCitySlug) as ProductWithBusiness[];
}

export const getFeaturedProducts = unstable_cache(
  async (limit = 8): Promise<ProductWithBusiness[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        `*, business:businesses(${PRODUCT_BUSINESS_SELECT})`,
      )
      .eq("status", "published")
      // Products are first-class marketplace inventory. `featured` controls
      // ordering only; an empty featured set must never make the homepage
      // product rail disappear.
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return ((data ?? [])
      .filter((row) => (row as { business?: { status?: string | null } | null }).business?.status === "approved")
      .map(attachSellerCitySlug)) as ProductWithBusiness[];
  },
  ["q:featured-products"],
  { tags: ["products"], revalidate: 60 },
);

export const searchProducts = cache(
  async (query: string, limit = 24): Promise<Product[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "published")
      .ilike("name", `%${query}%`)
      .order("featured", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  },
);

export type AdminBusiness = Business & {
  categories: Pick<Category, "name_ar" | "name_fr" | "name_en"> | null;
  profiles: Pick<Profile, "full_name"> | null;
};

/* ==========================================================================
 * Product discovery
 * ========================================================================== */

/** Seller projection joined to product rows (fields proven on `businesses`). */
export type ProductBusiness = Pick<
  Business,
  | "id"
  | "name"
  | "slug"
  | "logo_url"
  | "cover_url"
  | "city"
  | "city_id"
  | "verified"
  | "whatsapp"
  | "whatsapp_url"
  | "whatsapp_enabled"
  | "phone"
  | "owner_id"
  | "rating_avg"
  | "reviews_count"
  | "plan"
  | "status"
> & {
  /** Canonical city slug resolved from the cities table (via `city_id`). */
  city_slug?: string | null;
};

export type ProductWithBusiness = Product & {
  business: ProductBusiness | null;
};

export type ProductDetail = ProductWithBusiness & {
  categories: Pick<Category, "slug" | "name_ar" | "name_fr" | "name_en"> | null;
};

export type ProductListFilters = {
  query?: string;
  categoryId?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "popular";
  limit?: number;
  offset?: number;
};

const PRODUCT_BUSINESS_SELECT = `id, name, slug, logo_url, cover_url, city, city_id, verified, whatsapp, whatsapp_url, whatsapp_enabled, phone, owner_id, rating_avg, reviews_count, plan, status, ${CITY_SLUG_JOIN}`;

/** Single published product by slug, with its seller (and category resolved separately). */
export const getProductBySlug = unstable_cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(`*, business:businesses(${PRODUCT_BUSINESS_SELECT})`)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;

    const base = attachSellerCitySlug(data) as ProductWithBusiness;
    if (base.business?.status !== "approved") return null;
    let categories: ProductDetail["categories"] = null;
    if (base.category_id) {
      const { data: cat } = await supabase
        .from("categories")
        .select("slug, name_ar, name_fr, name_en")
        .eq("id", base.category_id)
        .maybeSingle();
      if (cat) categories = cat as ProductDetail["categories"];
    }
    return { ...base, categories };
  },
  ["q:product-by-slug"],
  { tags: ["products"], revalidate: 300 },
);

/** Same-category published products (deterministic, by real view counts). */
export const getSimilarProducts = unstable_cache(
  async (
    categoryId: string | null,
    productId: string,
    limit = 4,
  ): Promise<ProductWithBusiness[]> => {
    if (!categoryId) return [];
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(`*, business:businesses(${PRODUCT_BUSINESS_SELECT})`)
      .eq("status", "published")
      .eq("category_id", categoryId)
      .neq("id", productId)
      .order("views", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return ((data ?? [])
      .filter((row) => (row as { business?: { status?: string | null } | null }).business?.status === "approved")
      .map(attachSellerCitySlug)) as ProductWithBusiness[];
  },
  ["q:similar-products"],
  { tags: ["products"], revalidate: 300 },
);

const PRODUCT_SORT_COLUMNS: Record<
  NonNullable<ProductListFilters["sort"]>,
  { column: string; ascending: boolean }
> = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "price", ascending: true },
  price_desc: { column: "price", ascending: false },
  popular: { column: "views", ascending: false },
};

/** Published catalog rows with real total count, using only existing fields. */
export const getPublishedProducts = unstable_cache(
  async (
    filters: ProductListFilters = {},
  ): Promise<{ items: ProductWithBusiness[]; total: number }> => {
    const supabase = createPublicClient();
    const limit = filters.limit ?? 24;
    const offset = filters.offset ?? 0;

    let q = supabase
      .from("products")
      .select(`*, business:businesses(${PRODUCT_BUSINESS_SELECT})`, {
        count: "exact",
      })
      .eq("status", "published");
    if (filters.query) q = q.ilike("name", `%${filters.query}%`);
    if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
    if (filters.inStock) q = q.gt("stock", 0);
    if (filters.minPrice != null) q = q.gte("price", filters.minPrice);
    if (filters.maxPrice != null) q = q.lte("price", filters.maxPrice);
    const sort = PRODUCT_SORT_COLUMNS[filters.sort ?? "newest"];
    q = q.order(sort.column, { ascending: sort.ascending });

    const { data, error } = await q.range(offset, offset + limit - 1);
    if (error || !data) return { items: [], total: 0 };
    const approved = (data ?? []).filter((row) =>
      (row as { business?: { status?: string | null } | null }).business?.status === "approved",
    );
    return {
      items: approved.map(attachSellerCitySlug) as ProductWithBusiness[],
      // The join cannot safely provide an exact approved-provider count without
      // a second query, so expose the visible result count rather than a false total.
      total: approved.length,
    };
  },
  ["q:published-products"],
  { tags: ["products"], revalidate: 120 },
);

/* ==========================================================================
 * Service discovery
 * ========================================================================== */

export type ServiceBusiness = ProductBusiness & { category_id: string };

export type ServiceWithBusiness = Service & {
  business: ServiceBusiness | null;
};

export type ServiceDetail = ServiceWithBusiness & {
  categories: Pick<Category, "slug" | "name_ar" | "name_fr" | "name_en"> | null;
};

export type ServiceListFilters = {
  query?: string;
  categoryId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
};

const SERVICE_BUSINESS_SELECT = `${PRODUCT_BUSINESS_SELECT}, category_id, status`;

/** Single published service by id, with its provider business (and category resolved separately). */
export const getServiceById = unstable_cache(
  async (id: string): Promise<ServiceDetail | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("services")
      .select(`*, business:businesses(${SERVICE_BUSINESS_SELECT})`)
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;

    const base = attachSellerCitySlug(data) as ServiceWithBusiness;
    let categories: ServiceDetail["categories"] = null;
    const categoryId = base.business?.category_id ?? null;
    if (categoryId) {
      const { data: cat } = await supabase
        .from("categories")
        .select("slug, name_ar, name_fr, name_en")
        .eq("id", categoryId)
        .maybeSingle();
      if (cat) categories = cat as ServiceDetail["categories"];
    }
    return { ...base, categories };
  },
  ["q:service-by-id"],
  { tags: ["services"], revalidate: 300 },
);

/** Published services of the same provider (deterministic: featured first, then recency). */
export const getServicesForBusinessRow = unstable_cache(
  async (
    businessId: string,
    serviceId: string,
    limit = 4,
  ): Promise<ServiceWithBusiness[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("services")
      .select(`*, business:businesses(${SERVICE_BUSINESS_SELECT})`)
      .eq("business_id", businessId)
      .eq("status", "published")
      .neq("id", serviceId)
      .order("featured", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return ((data ?? []) as unknown[]).map(attachSellerCitySlug) as ServiceWithBusiness[];
  },
  ["q:services-for-business-row"],
  { tags: ["services"], revalidate: 300 },
);

/** Services from providers in the same category (deterministic, real data only). */
export const getSimilarServices = unstable_cache(
  async (
    categoryId: string | null,
    serviceId: string,
    businessId: string,
    limit = 4,
  ): Promise<ServiceWithBusiness[]> => {
    if (!categoryId) return [];
    const supabase = createPublicClient();
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id")
      .eq("category_id", categoryId)
      .eq("status", "approved")
      .neq("id", businessId)
      .limit(50);
    const ids = (businesses ?? []).map((b) => b.id);
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("services")
      .select(`*, business:businesses(${SERVICE_BUSINESS_SELECT})`)
      .eq("status", "published")
      .neq("id", serviceId)
      .in("business_id", ids)
      .order("featured", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return ((data ?? []) as unknown[]).map(attachSellerCitySlug) as ServiceWithBusiness[];
  },
  ["q:similar-services"],
  { tags: ["services"], revalidate: 300 },
);

const SERVICE_SORT_COLUMNS: Record<
  NonNullable<ServiceListFilters["sort"]>,
  { column: string; ascending: boolean }
> = {
  newest: { column: "updated_at", ascending: false },
  price_asc: { column: "price", ascending: true },
  price_desc: { column: "price", ascending: false },
};

/** Published catalog rows with real total count, using only existing fields. */
export const getPublishedServices = unstable_cache(
  async (
    filters: ServiceListFilters = {},
  ): Promise<{ items: ServiceWithBusiness[]; total: number }> => {
    const supabase = createPublicClient();
    const limit = filters.limit ?? 24;
    const offset = filters.offset ?? 0;

    // Services are public only when both the service and its provider are published.
    // Resolve approved provider ids first; this also prevents orphaned service leaks.
    let providers = supabase
      .from("businesses")
      .select("id")
      .eq("status", "approved");
    if (filters.categoryId) providers = providers.eq("category_id", filters.categoryId);
    if (filters.city) providers = providers.or(`city.eq.${filters.city},city_id.eq.${filters.city}`);
    const { data: approvedBusinesses } = await providers;
    const businessIds = (approvedBusinesses ?? []).map((b) => b.id);
    if (businessIds && businessIds.length === 0) {
      return { items: [], total: 0 };
    }

    let q = supabase
      .from("services")
      .select(`*, business:businesses(${SERVICE_BUSINESS_SELECT})`, {
        count: "exact",
      })
      .eq("status", "published");
    if (filters.query) q = q.ilike("name", `%${filters.query}%`);
    if (filters.minPrice != null) q = q.gte("price", filters.minPrice);
    if (filters.maxPrice != null) q = q.lte("price", filters.maxPrice);
    if (businessIds) q = q.in("business_id", businessIds);

    const sort = SERVICE_SORT_COLUMNS[filters.sort ?? "newest"];
    q = q.order(sort.column, { ascending: sort.ascending });

    const { data, error, count } = await q.range(offset, offset + limit - 1);
    if (error || !data) return { items: [], total: 0 };
    return {
      items: ((data ?? []) as unknown[]).map(attachSellerCitySlug) as ServiceWithBusiness[],
      total: count ?? 0,
    };
  },
  ["q:published-services"],
  { tags: ["services"], revalidate: 120 },
);

/** Home rails: published services with their provider, featured first then recency. */
export const getPopularServices = unstable_cache(
  async (limit = 8): Promise<ServiceWithBusiness[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("services")
      .select(`*, business:businesses(${SERVICE_BUSINESS_SELECT})`)
      .eq("status", "published")
      .eq("business.status", "approved")
      .order("featured", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return ((data ?? [])
      .filter((row) => (row as { business?: { status?: string | null } | null }).business?.status === "approved")
      .map(attachSellerCitySlug)) as ServiceWithBusiness[];
  },
  ["q:popular-services"],
  { tags: ["services"], revalidate: 60 },
);

/* ==========================================================================
 * Unified search index — city-aware auto-population feeds
 * Used by the /search landing (empty query) to show popular / trending /
 * highly-rated content for the user's city, with a global fallback.
 * ========================================================================== */

export type IndexFilters = {
  /** Canonical `cities.name_en` value (already resolved). */
  city?: string;
  limit?: number;
  sort?: "newest" | "rating" | "reviews";
};

/** Popular/trending/highly-rated approved businesses, optionally city-scoped. */
export const getIndexBusinesses = unstable_cache(
  async (f: IndexFilters = {}): Promise<BusinessWithCategory[]> => {
    const supabase = createPublicClient();
    let q = supabase
      .from("businesses")
      .select(`*, categories!businesses_category_id_fkey(*), ${CITY_SLUG_JOIN}`)
      .eq("status", "approved");
    if (f.city) q = q.eq("city", f.city);

    const col = f.sort ?? "reviews";
    const order =
      col === "rating"
        ? { rating_avg: false }
        : col === "newest"
          ? { created_at: false }
          : { reviews_count: false };
    const entries = Object.entries(order) as [string, boolean][];
    for (const [column, ascending] of entries) {
      q = q.order(column, { ascending });
    }
    q = q.limit(f.limit ?? 8);

    const { data, error } = await q;
    if (error || !data) return [];
    return (data ?? []).map(attachCitySlug) as unknown as BusinessWithCategory[];
  },
  ["q:index-businesses"],
  { tags: ["businesses"], revalidate: 300 },
);

/** Published services from approved providers, optionally city-scoped. */
export const getIndexServices = unstable_cache(
  async (f: IndexFilters = {}): Promise<ServiceWithBusiness[]> => {
    const supabase = createPublicClient();
    let q = supabase
      .from("services")
      .select(`*, business:businesses(${SERVICE_BUSINESS_SELECT})`)
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(f.limit ?? 8);
    if (f.city) q = q.eq("business.city", f.city);

    const { data, error } = await q;
    if (error || !data) return [];
    return ((data ?? []) as unknown[]).map(attachSellerCitySlug) as ServiceWithBusiness[];
  },
  ["q:index-services"],
  { tags: ["services"], revalidate: 300 },
);

/** Published products from approved sellers, optionally city-scoped. */
export const getIndexProducts = unstable_cache(
  async (f: IndexFilters = {}): Promise<ProductWithBusiness[]> => {
    const supabase = createPublicClient();
    let q = supabase
      .from("products")
      .select(`*, business:businesses(${PRODUCT_BUSINESS_SELECT})`)
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("views", { ascending: false })
      .limit(f.limit ?? 8);
    if (f.city) q = q.eq("business.city", f.city);

    const { data, error } = await q;
    if (error || !data) return [];
    return ((data ?? []) as unknown[]).map(attachSellerCitySlug) as ProductWithBusiness[];
  },
  ["q:index-products"],
  { tags: ["products"], revalidate: 300 },
);

/** Approved business counts per category, optionally city-scoped. */
export const getIndexCategoryCounts = unstable_cache(
  async (city?: string): Promise<Record<string, number>> => {
    const supabase = createPublicClient();
    let q = supabase
      .from("businesses")
      .select("category_id")
      .eq("status", "approved");
    if (city) q = q.eq("city", city);
    const { data, error } = await q;
    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const row of data) counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
    return counts;
  },
  ["q:index-category-counts"],
  { tags: ["businesses"], revalidate: 300 },
);

export async function getAllBusinesses(): Promise<AdminBusiness[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*, categories!businesses_category_id_fkey(name_ar, name_fr, name_en), profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as AdminBusiness[];
}

export type AdminService = Service & {
  business: (Pick<Business, "name" | "slug"> & {
    profiles: Pick<Profile, "full_name"> | null;
  }) | null;
  category: Pick<Category, "name_ar" | "name_fr" | "name_en"> | null;
};

export async function getAdminServices(): Promise<AdminService[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "*, business:businesses(name, slug, profiles(full_name)), category:categories!services_category_id_fkey(name_ar, name_fr, name_en)"
    )
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data as AdminService[];
}

export type AdminProduct = Product & {
  business: (Pick<Business, "name" | "slug"> & {
    profiles: Pick<Profile, "full_name"> | null;
  }) | null;
  category: Pick<Category, "name_ar" | "name_fr" | "name_en"> | null;
};

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, business:businesses(name, slug, profiles(full_name)), category:categories!products_category_id_fkey(name_ar, name_fr, name_en)"
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as AdminProduct[];
}

export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export type AdminUserRow = Profile & {
  email: string | null;
  provider: string | null;
  business_count: number;
};

/**
 * Admin-only directory of users enriched with data the architecture safely
 * exposes: email + auth provider (from auth.users via the service role,
 * server-side only) and business-ownership counts (public aggregate).
 * Passwords, tokens and session secrets are never returned.
 */
export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !profiles) return [];

  const { data: owners } = await supabase.from("businesses").select("owner_id");
  const counts = new Map<string, number>();
  for (const b of owners ?? []) {
    if (b.owner_id) counts.set(b.owner_id, (counts.get(b.owner_id) ?? 0) + 1);
  }

  const authMap = new Map<string, { email: string | null; provider: string | null }>();
  const svc = createServiceClient();
  if (svc) {
    let page = 1;
    const perPage = 200;
    while (page <= 25) {
      const { data, error: authErr } = await svc.auth.admin.listUsers({ page, perPage });
      if (authErr || !data?.users?.length) break;
      for (const u of data.users) {
        const provider =
          (u.app_metadata?.provider as string | undefined) ??
          u.identities?.[0]?.provider ??
          null;
        authMap.set(u.id, { email: u.email ?? null, provider });
      }
      if (data.users.length < perPage) break;
      page++;
    }
  }

  return profiles.map((p) => {
    const a = authMap.get(p.id);
    return {
      ...p,
      email: a?.email ?? null,
      provider: a?.provider ?? null,
      business_count: counts.get(p.id) ?? 0,
    };
  });
}

export async function getAllBookings() {
  const supabase = await createClient();
  const result = (await supabase
    .from("bookings")
    .select("*, businesses(name, slug), services(name)")
    .order("created_at", { ascending: false })) as unknown as {
    data: (Booking & {
      businesses: { name: string; slug: string } | null;
      services: { name: string } | null;
    })[] | null;
    error: unknown;
  };

  if (result.error || !result.data) return [];
  return result.data;
}

export async function getAdminStats() {
  const supabase = await createClient();

  const [businesses, users, bookings, reviews] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
  ]);

  return {
    businesses: businesses.error ? 0 : (businesses.count ?? 0),
    users: users.error ? 0 : (users.count ?? 0),
    bookings: bookings.error ? 0 : (bookings.count ?? 0),
    reviews: reviews.error ? 0 : (reviews.count ?? 0),
  };
}

export type AdminOverview = {
  totalUsers: number;
  monthlyUserGrowth: number;
  totalBusinesses: number;
  businessesByPlan: { free: number; premium: number; pro: number };
  pendingBusinesses: number;
  pendingServices: number;
  pendingProducts: number;
  mrrCents: number;
  totalRevenueCents: number;
  topCities: { id: string; name: string; count: number }[];
  topCategories: { id: string; name: string; count: number }[];
};

/** Real admin dashboard KPIs aggregated from live tables. Graceful on errors. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [
    users,
    users30,
    bizTotal,
    bizFree,
    bizPremium,
    bizPro,
    pendBiz,
    pendSvc,
    pendPrd,
    subs,
    plansRes,
    payRes,
    bizGeo,
    citiesRes,
    catsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30),
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("plan", "free"),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("plan", "premium"),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("plan", "pro"),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("subscriptions").select("plan, interval, status").eq("status", "active"),
    supabase.from("plans").select("plan_key, interval, price_cents, active"),
    supabase.from("payments").select("amount_cents, status"),
    supabase.from("businesses").select("city_id, category_id"),
    supabase.from("cities").select("id, name_en, name_fr, name_ar"),
    supabase.from("categories").select("id, name_en, name_fr, name_ar"),
  ]);

  const totalUsers = users.error ? 0 : (users.count ?? 0);
  const monthlyUserGrowth = users30.error ? 0 : (users30.count ?? 0);
  const totalBusinesses = bizTotal.error ? 0 : (bizTotal.count ?? 0);
  const businessesByPlan = {
    free: bizFree.error ? 0 : (bizFree.count ?? 0),
    premium: bizPremium.error ? 0 : (bizPremium.count ?? 0),
    pro: bizPro.error ? 0 : (bizPro.count ?? 0),
  };
  const pendingBusinesses = pendBiz.error ? 0 : (pendBiz.count ?? 0);
  const pendingServices = pendSvc.error ? 0 : (pendSvc.count ?? 0);
  const pendingProducts = pendPrd.error ? 0 : (pendPrd.count ?? 0);

  // MRR: sum plan price for active subscriptions (matched by plan_key + interval).
  const planPrice = new Map<string, number>();
  (plansRes.data ?? []).forEach((p) => {
    planPrice.set(`${p.plan_key}:${p.interval}`, Number(p.price_cents) || 0);
  });
  let mrrCents = 0;
  (subs.data ?? []).forEach((s) => {
    mrrCents += planPrice.get(`${s.plan}:${s.interval}`) ?? 0;
  });

  let totalRevenueCents = 0;
  (payRes.data ?? []).forEach((p) => {
    if (p.status === "succeeded") totalRevenueCents += Number(p.amount_cents) || 0;
  });

  const cityName = new Map<string, string>();
  (citiesRes.data ?? []).forEach((c) => {
    cityName.set(c.id, c.name_en || c.name_fr || c.name_ar || c.id);
  });
  const catName = new Map<string, string>();
  (catsRes.data ?? []).forEach((c) => {
    catName.set(c.id, c.name_en || c.name_fr || c.name_ar || c.id);
  });

  const cityCounts = new Map<string, number>();
  const catCounts = new Map<string, number>();
  (bizGeo.data ?? []).forEach((b) => {
    if (b.city_id) cityCounts.set(b.city_id, (cityCounts.get(b.city_id) ?? 0) + 1);
    if (b.category_id) catCounts.set(b.category_id, (catCounts.get(b.category_id) ?? 0) + 1);
  });

  const topCities = [...cityCounts.entries()]
    .map(([id, count]) => ({ id, name: cityName.get(id) ?? id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topCategories = [...catCounts.entries()]
    .map(([id, count]) => ({ id, name: catName.get(id) ?? id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalUsers,
    monthlyUserGrowth,
    totalBusinesses,
    businessesByPlan,
    pendingBusinesses,
    pendingServices,
    pendingProducts,
    mrrCents,
    totalRevenueCents,
    topCities,
    topCategories,
  };
}

export async function getReports(): Promise<Report[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}
