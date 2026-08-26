import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";
import { businessHref } from "@/lib/business/url";
import {
  getCategories,
  getSitemapBusinesses,
  getSitemapProducts,
  getSitemapServices,
} from "@/lib/queries";
import { buildSitemapEntries } from "@/lib/sitemap-entries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, businesses, products, services] = await Promise.all([
    getCategories(),
    getSitemapBusinesses(),
    getSitemapProducts(),
    getSitemapServices(),
  ]);

  return buildSitemapEntries(
    { categories, businesses, products, services },
    { siteUrl: siteUrl(), businessHref, locales: routing.locales },
  );
}
