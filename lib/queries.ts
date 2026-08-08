import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
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
};

export type BusinessDetail = Business & {
  categories: Pick<Category, "slug" | "name_ar" | "name_fr" | "name_en"> | null;
  services: Service[];
  media: { id: string; type: "image" | "video"; url: string }[];
  reviews: (Review & { profile: { full_name: string | null } | null })[];
  hours: { id: string; day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }[];
};

const SORT_ORDER = { pro: 0, premium: 1, free: 2 } as const;

/**
 * All query helpers catch errors and return empty data so the app can
 * render (with empty states) even before Supabase credentials are set.
 */
export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data;
});

export const getCityBySlug = cache(
  async (slug: string): Promise<City | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  },
);

export const getCategoryBySlug = cache(
  async (slug: string): Promise<Category | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

  if (error || !data) return null;
  return data;
  },
);

export const getFeaturedBusinesses = cache(
  async (): Promise<BusinessWithCategory[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("businesses")
      .select("*, categories!businesses_category_id_fkey(*)")
      .eq("status", "approved")
      .order("plan", { ascending: true })
      .order("rating_avg", { ascending: false })
      .order("reviews_count", { ascending: false })
      .limit(8);

    if (error || !data) return [];
    return data as BusinessWithCategory[];
  },
);

export const getBusinessesByCategory = cache(
  async (categorySlug: string): Promise<BusinessWithCategory[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("businesses")
      .select("*, categories!businesses_category_id_fkey!inner(*)")
      .eq("status", "approved")
      .eq("categories.slug", categorySlug)
      .order("plan", { ascending: true })
      .order("rating_avg", { ascending: false });

    if (error || !data) return [];
    return data as BusinessWithCategory[];
  },
);

export const getBusinessesByCity = cache(
  async (city: string): Promise<BusinessWithCategory[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("businesses")
      .select("*, categories!businesses_category_id_fkey(*)")
      .eq("status", "approved")
      .ilike("city", `%${city}%`)
      .order("plan", { ascending: true })
      .order("rating_avg", { ascending: false });

    if (error || !data) return [];
    return data as BusinessWithCategory[];
  },
);

export const searchBusinesses = cache(
  async (query: string, city?: string): Promise<BusinessWithCategory[]> => {
    const supabase = await createClient();
    let builder = supabase
      .from("businesses")
      .select("*, categories!businesses_category_id_fkey(*)")
      .eq("status", "approved")
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

    if (city) {
      builder = builder.eq("city", city);
    }

    const { data, error } = await builder
      .order("plan", { ascending: true })
      .order("rating_avg", { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data as BusinessWithCategory[];
  },
);

type JoinedBusiness = Business & {
  categories: Pick<Category, "slug" | "name_ar" | "name_fr" | "name_en"> | null;
};

export const getBusinessBySlug = cache(
  async (slug: string): Promise<BusinessDetail | null> => {
    const supabase = await createClient();

    const businessResult = (await supabase
      .from("businesses")
      .select("*, categories!businesses_category_id_fkey(slug, name_ar, name_fr, name_en)")
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle()) as unknown as {
      data: JoinedBusiness | null;
      error: { message: string } | null;
    };

    const business = businessResult.data;
    if (!business) return null;

    const [services, media, reviews, hours] = await Promise.all([
    supabase
      .from("services")
      .select("id, business_id, name, price, duration_minutes, description, photo_url, status, gallery, featured, updated_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true }),
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
      ...business,
      services: services.data ?? [],
      media: media.data ?? [],
      reviews: (reviews.data ?? []) as BusinessDetail["reviews"],
      hours: hours.data ?? [],
    };
  },
);

export const getRelatedBusinesses = cache(
  async (business: BusinessDetail): Promise<BusinessWithCategory[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("businesses")
      .select("*, categories!businesses_category_id_fkey(*)")
      .eq("category_id", business.category_id)
      .eq("status", "approved")
      .neq("id", business.id)
      .order("plan", { ascending: true })
      .order("rating_avg", { ascending: false })
      .limit(4);

    if (error || !data) return [];
    return data as BusinessWithCategory[];
  },
);

export async function getBusinessCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  return error ? 0 : (count ?? 0);
}

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
    .select("*, categories!businesses_category_id_fkey(slug, name_ar, name_fr, name_en)")
    .eq("owner_id", ownerId)
    .maybeSingle()) as unknown as {
    data: JoinedBusiness | null;
    error: { message: string } | null;
  };

  const business = businessResult.data;
  if (!business) return null;

  const [services, media, hours, reviews] = await Promise.all([
      supabase
        .from("services")
.select("id, business_id, name, price, duration_minutes, description, photo_url, status, gallery, featured, updated_at")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true }),
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
      ...business,
      services: services.data ?? [],
      media: media.data ?? [],
      hours: hours.data ?? [],
      reviews: (reviews.data ?? []) as BusinessDetail["reviews"],
    };
}

export { SORT_ORDER };

export const getProductsForBusiness = cache(
  async (businessId: string): Promise<Product[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data ?? [];
  },
);

export const getFeaturedProducts = cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, business:businesses(id, name, slug, logo_url)")
      .eq("status", "published")
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  },
);

export const getProductsByCategory = cache(
  async (categoryId: string, limit = 12): Promise<Product[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category_id", categoryId)
      .eq("status", "published")
      .order("views", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  },
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

export async function getAdminBusinesses(): Promise<AdminBusiness[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*, categories!businesses_category_id_fkey(name_ar, name_fr, name_en), profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as AdminBusiness[];
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

export type AnalyticsSummary = {
  total: number;
  views: number;
  whatsapp_clicks: number;
  call_clicks: number;
  leads: number;
  photo_views: number;
  /** last 14 days, oldest first: { date, views, leads } */
  series: { date: string; views: number; leads: number }[];
};

/** Aggregated analytics for a business owner. Graceful on empty data. */
export async function getOwnerAnalytics(
  businessId: string,
): Promise<AnalyticsSummary> {
  const supabase = await createClient();
  const empty: AnalyticsSummary = {
    total: 0,
    views: 0,
    whatsapp_clicks: 0,
    call_clicks: 0,
    leads: 0,
    photo_views: 0,
    series: [],
  };
  if (!businessId) return empty;

  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_type, created_at")
    .eq("business_id", businessId);

  if (error || !data) return empty;

  const counts: Record<string, number> = {
    view: 0,
    whatsapp_click: 0,
    call_click: 0,
    lead: 0,
    photo_view: 0,
  };
  data.forEach((e) => {
    if (e.event_type in counts) counts[e.event_type] += 1;
  });

  const days = 14;
  const series: { date: string; views: number; leads: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, views: 0, leads: 0 });
  }
  const byDay = new Map<string, { views: number; leads: number }>();
  data.forEach((e) => {
    const key = new Date(e.created_at).toISOString().slice(0, 10);
    const slot = byDay.get(key) ?? { views: 0, leads: 0 };
    if (e.event_type === "view") slot.views += 1;
    else if (e.event_type === "lead") slot.leads += 1;
    byDay.set(key, slot);
  });
  for (const s of series) {
    const slot = byDay.get(s.date);
    if (slot) {
      s.views = slot.views;
      s.leads = slot.leads;
    }
  }

  return {
    total: data.length,
    views: counts.view,
    whatsapp_clicks: counts.whatsapp_click,
    call_clicks: counts.call_click,
    leads: counts.lead,
    photo_views: counts.photo_view,
    series,
  };
}

export type AdminDashboardStats = {
  businesses: number;
  pendingBusinesses: number;
  pendingVerification: number;
  users: number;
  premiumUsers: number;
  revenue: number;
  reports: number;
  categories: number;
  cities: number;
  reviews: number;
  bookings: number;
  subscriptions: number;
};

export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  const supabase = await createClient();
  const [
    businesses,
    pendingBusinesses,
    pendingVerification,
    users,
    premiumUsers,
    reports,
    categories,
    cities,
    reviews,
    bookings,
    subscriptions,
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .neq("plan", "free"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("cities").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }),
  ]);

  const n = (r: { count: number | null; error: unknown }) =>
    r.error ? 0 : (r.count ?? 0);

  return {
    businesses: n(businesses),
    pendingBusinesses: n(pendingBusinesses),
    pendingVerification: n(pendingVerification),
    users: n(users),
    premiumUsers: n(premiumUsers),
    revenue: 0,
    reports: n(reports),
    categories: n(categories),
    cities: n(cities),
    reviews: n(reviews),
    bookings: n(bookings),
    subscriptions: n(subscriptions),
  };
}

export async function getCities(): Promise<City[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data;
}

export type AdminReport = Report & {
  businesses: Pick<Business, "name" | "slug" | "status"> | null;
  profiles: Pick<Profile, "full_name"> | null;
};

export async function getAdminReports(): Promise<AdminReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*, businesses(name, slug, status), profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data as AdminReport[];
}

export type RecentActivity = {
  id: string;
  kind: "booking" | "review" | "report" | "signup";
  label: string;
  at: string;
};

export async function getRecentActivity(limit = 12): Promise<RecentActivity[]> {
  const supabase = await createClient();
  const [bookings, reviews, reports, signups] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, client_name, created_at, status")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("reviews")
      .select("id, rating, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("reports")
      .select("id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const list: RecentActivity[] = [];
  (bookings.data ?? []).forEach((b) =>
    list.push({
      id: b.id,
      kind: "booking",
      label: `${b.client_name ?? "?"} · ${b.status ?? "pending"}`,
      at: b.created_at,
    }),
  );
  (reviews.data ?? []).forEach((r) =>
    list.push({ id: r.id, kind: "review", label: `${r.rating}★ review`, at: r.created_at }),
  );
  (reports.data ?? []).forEach((r) =>
    list.push({
      id: r.id,
      kind: "report",
      label: `${r.reason ?? "report"}`,
      at: r.created_at,
    }),
  );
  (signups.data ?? []).forEach((p) =>
    list.push({ id: p.id, kind: "signup", label: `${p.full_name ?? "User"} joined`, at: p.created_at }),
  );

  return list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export type HealthReport = {
  ok: boolean;
  checks: { key: string; label: string; ok: boolean }[];
};

export async function getSystemHealth(): Promise<HealthReport> {
  const supabase = await createClient();
  const probes = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
  ]);

  const checks = probes.map((p, i) => ({
    key: ["users", "businesses", "reviews"][i] ?? "db",
    label: ["profiles", "businesses", "reviews"][i] ?? "db",
    ok: !p.error,
  }));
  return { ok: checks.every((c) => c.ok), checks };
}
