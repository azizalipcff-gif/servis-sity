import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { BusinessDetail, BusinessWithCategory } from "@/lib/queries";

const CITY_SLUG_JOIN = "cities!businesses_city_id_fkey(slug)";

type WithCityJoin = { cities?: { slug: string | null } | null };

function attachCitySlug<T extends object>(row: T & WithCityJoin): T & { city_slug: string | null } {
  const { cities, ...rest } = row as T & WithCityJoin;
  return { ...rest, city_slug: cities?.slug ?? null } as T & { city_slug: string | null };
}

export const getRelatedBusinesses = cache(async (business: BusinessDetail): Promise<BusinessWithCategory[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(`*, categories!businesses_category_id_fkey(*), ${CITY_SLUG_JOIN}`)
    .eq("category_id", business.category_id)
    .eq("status", "approved")
    .neq("id", business.id)
    .order("plan", { ascending: true })
    .order("rating_avg", { ascending: false })
    .limit(4);
  if (error || !data) return [];
  return data.map(attachCitySlug) as unknown as BusinessWithCategory[];
});
