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

export const dynamic = "force-dynamic";

function loc(path = ""): string {
  return `${siteUrl()}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, businesses, products, services] = await Promise.all([
    getCategories(),
    getSitemapBusinesses(),
    getSitemapProducts(),
    getSitemapServices(),
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

  // Localized top-level listing pages.
  const listingPaths = ["/business", "/products", "/services", "/pricing"];
  for (const path of listingPaths) {
    for (const locale of routing.locales) {
      entries.push({
        url: loc(`/${locale}${path}`),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
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

  // Localized published product detail pages.
  for (const product of products) {
    for (const locale of routing.locales) {
      entries.push({
        url: loc(`/${locale}/product/${product.slug}`),
        lastModified: product.updated_at
          ? new Date(product.updated_at)
          : new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  // Localized published service detail pages.
  for (const service of services) {
    for (const locale of routing.locales) {
      entries.push({
        url: loc(`/${locale}/service/${service.id}`),
        lastModified: service.updated_at
          ? new Date(service.updated_at)
          : new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
