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
  ["q:homepage-cities"],
  { tags: ["cities"], revalidate: 300 },
);
