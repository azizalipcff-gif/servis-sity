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

function isSafeSlug(s?: string | null): s is string {
  return (
    typeof s === "string" &&
    s.length > 0 &&
    s.trim() === s &&
    !s.includes("/")
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, businesses, products, services] = await Promise.all([
    getCategories(),
    getSitemapBusinesses(),
    getSitemapProducts(),
    getSitemapServices(),
  ]);

  const origin = siteUrl();
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  function add(entry: MetadataRoute.Sitemap[number] | undefined) {
    if (!entry || !entry.url) return;
    const url = String(entry.url);
    if (url !== origin && !url.startsWith(`${origin}/`)) return;
    if (url.includes("?") || url.includes("#")) return;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push(entry);
  }

  for (const locale of routing.locales) {
    add({
      url: loc(`/${locale}`),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    });
  }

  const listingPaths = [
    "/business",
    "/products",
    "/services",
    "/pricing",
    "/help",
  ];
  for (const path of listingPaths) {
    for (const locale of routing.locales) {
      add({
        url: loc(`/${locale}${path}`),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  for (const category of categories) {
    if (!isSafeSlug(category?.slug)) continue;
    for (const locale of routing.locales) {
      add({
        url: loc(`/${locale}/category/${category.slug}`),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  for (const business of businesses) {
    if (!isSafeSlug(business?.slug)) continue;
    for (const locale of routing.locales) {
      add({
        url: loc(`/${locale}${businessHref(business)}`),
        lastModified: business.last_updated_at
          ? new Date(business.last_updated_at)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  for (const product of products) {
    if (!isSafeSlug(product?.slug)) continue;
    for (const locale of routing.locales) {
      add({
        url: loc(`/${locale}/product/${product.slug}`),
        lastModified: product.updated_at
          ? new Date(product.updated_at)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  for (const service of services) {
    if (!service?.id) continue;
    for (const locale of routing.locales) {
      add({
        url: loc(`/${locale}/service/${service.id}`),
        lastModified: service.updated_at
          ? new Date(service.updated_at)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
