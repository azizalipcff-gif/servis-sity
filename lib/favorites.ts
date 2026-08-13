import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Business, Category, Product, Service } from "@/lib/supabase/database.types";

export type FavoriteBusiness = Business & {
  categories: Category | null;
};

export type FavoriteService = Service & {
  business: {
    id: string;
    name: string | null;
    slug: string | null;
    logo_url: string | null;
    verified: boolean;
    city: string | null;
    rating_avg: number;
    reviews_count: number;
  } | null;
};

export type FavoriteProduct = Product & {
  business: {
    id: string;
    name: string | null;
    slug: string | null;
    logo_url: string | null;
    verified: boolean;
    city: string | null;
    rating_avg: number;
    reviews_count: number;
  } | null;
};

export type FavoritesData = {
  businesses: FavoriteBusiness[];
  services: FavoriteService[];
  products: FavoriteProduct[];
};

const BUSINESS_SELECT = "*, categories!businesses_category_id_fkey(*)";
const SELLER_SELECT =
  "id, name, slug, logo_url, verified, city, rating_avg, reviews_count";

/**
 * All favorites for a user, grouped by type with their full target rows, in
 * most-recently-favorited order. Runs inside the user's RLS session.
 */
export const getFavoritesForUser = cache(
  async (userId: string): Promise<FavoritesData> => {
    const supabase = await createClient();
    const empty: FavoritesData = { businesses: [], services: [], products: [] };

    const { data: rows, error } = await supabase
      .from("favorites")
      .select("id, item_type, business_id, service_id, product_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error || !rows || rows.length === 0) return empty;

    const businessIds: string[] = [];
    const serviceIds: string[] = [];
    const productIds: string[] = [];

    for (const row of rows) {
      if (row.item_type === "business" && row.business_id) {
        businessIds.push(row.business_id);
      } else if (row.item_type === "service" && row.service_id) {
        serviceIds.push(row.service_id);
      } else if (row.item_type === "product" && row.product_id) {
        productIds.push(row.product_id);
      }
    }

    const [businessesResult, servicesResult, productsResult] = await Promise.all([
      businessIds.length > 0
        ? supabase.from("businesses").select(BUSINESS_SELECT).in("id", businessIds)
        : Promise.resolve({ data: [], error: null }),
      serviceIds.length > 0
        ? supabase
            .from("services")
            .select(`*, business:businesses(${SELLER_SELECT})`)
            .in("id", serviceIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length > 0
        ? supabase
            .from("products")
            .select(`*, business:businesses(${SELLER_SELECT})`)
            .in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const businessesByOrder = new Map(
      (businessesResult.data ?? []).map((item: FavoriteBusiness) => [item.id, item]),
    );
    const servicesByOrder = new Map(
      (servicesResult.data ?? []).map((item: FavoriteService) => [item.id, item]),
    );
    const productsByOrder = new Map(
      (productsResult.data ?? []).map((item: FavoriteProduct) => [item.id, item]),
    );

    const businesses: FavoriteBusiness[] = [];
    const services: FavoriteService[] = [];
    const products: FavoriteProduct[] = [];

    for (const row of rows) {
      if (row.item_type === "business" && row.business_id) {
        const item = businessesByOrder.get(row.business_id);
        if (item) businesses.push(item);
      } else if (row.item_type === "service" && row.service_id) {
        const item = servicesByOrder.get(row.service_id);
        if (item) services.push(item);
      } else if (row.item_type === "product" && row.product_id) {
        const item = productsByOrder.get(row.product_id);
        if (item) products.push(item);
      }
    }

    return { businesses, services, products };
  },
);