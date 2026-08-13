import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";
import { businessHref } from "@/lib/business/url";
import { getCategories, getSitemapBusinesses } from "@/lib/queries";

export const dynamic = "force-dynamic";

function loc(path = ""): string {
  return `${siteUrl()}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, businesses] = await Promise.all([
    getCategories(),
    getSitemapBusinesses(),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  // Localized homepages.
  for (const locale of routing.locales) {
    entries.push({
      url: loc(`/${locale}`),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    });
  }

  // Localized category pages (real categories only).
  for (const category of categories) {
    for (const locale of routing.locales) {
      entries.push({
        url: loc(`/${locale}/category/${category.slug}`),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  // Localized approved business pages.
  for (const business of businesses) {
    for (const locale of routing.locales) {
      entries.push({
        url: loc(`/${locale}${businessHref(business)}`),
        lastModified: business.last_updated_at
          ? new Date(business.last_updated_at)
          : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}