import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl, isCityIndexable } from "@/lib/seo";
import { businessHref } from "@/lib/business/url";
import {
  getCategories,
  getSitemapBusinesses,
  getSitemapProducts,
  getSitemapServices,
} from "@/lib/queries";
import { getCities, getCitySupplyMap } from "@/lib/home-queries";
import { buildSitemapEntries } from "@/lib/sitemap-entries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, businesses, products, services, cities, supply] = await Promise.all([
    getCategories(),
    getSitemapBusinesses(),
    getSitemapProducts(),
    getSitemapServices(),
    getCities(),
    getCitySupplyMap(),
  ]);

  const cityEntries = cities
    .filter((c) =>
      isCityIndexable(
        supply[c.name_en] ?? { businesses: 0, services: 0 },
      ),
    )
    .map((c) => ({ slug: c.slug }));

  return buildSitemapEntries(
    { categories, businesses, products, services, cities: cityEntries },
    { siteUrl: siteUrl(), businessHref, locales: routing.locales },
  );
}
