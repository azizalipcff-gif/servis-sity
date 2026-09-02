import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import type { City } from "@/lib/supabase/database.types";

/** Public city directory used by the homepage and city selectors. */
export const getCities = unstable_cache(
  async (): Promise<City[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .order("name_en", { ascending: true });

    return error || !data ? [] : data;
  },
  ["q:cities"],
  { tags: ["cities"], revalidate: 300 },
);

/**
 * Per-city supply counts used by the sitemap to decide which city landing
 * pages have enough live marketplace inventory to be indexable.
 */
export const getCitySupplyMap = unstable_cache(
  async (): Promise<Record<string, { businesses: number; services: number; products: number }>> => {
    const supabase = createPublicClient();
    const [businesses, services, products] = await Promise.all([
      supabase.from("businesses").select("id, city_id").eq("status", "approved"),
      supabase.from("services").select("business_id").eq("status", "published"),
      supabase.from("products").select("business_id").eq("status", "published"),
    ]);

    if (businesses.error || services.error || products.error) return {};

    const cityByBusiness = new Map<string, string>();
    const result: Record<string, { businesses: number; services: number; products: number }> = {};

    for (const row of businesses.data ?? []) {
      if (!row.city_id) continue;
      cityByBusiness.set(row.id, row.city_id);
      const current = result[row.city_id] ?? { businesses: 0, services: 0, products: 0 };
      current.businesses += 1;
      result[row.city_id] = current;
    }

    for (const row of services.data ?? []) {
      const cityId = cityByBusiness.get(row.business_id);
      if (!cityId) continue;
      result[cityId] ??= { businesses: 0, services: 0, products: 0 };
      result[cityId].services += 1;
    }

    for (const row of products.data ?? []) {
      const cityId = cityByBusiness.get(row.business_id);
      if (!cityId) continue;
      result[cityId] ??= { businesses: 0, services: 0, products: 0 };
      result[cityId].products += 1;
    }

    return result;
  },
  ["q:city-supply-map"],
  { tags: ["cities", "businesses", "services", "products"], revalidate: 3600 },
);
