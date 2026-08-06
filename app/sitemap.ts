import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

const locales = ["en", "fr", "ar"] as const;
const defaultLocale = "ar";

function loc(path = ""): string {
  return `${siteUrl()}${path}`;
}

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes present across every locale.
  const staticPaths = ["", "/search", "/dashboard"];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: loc(`/${locale}${path}`),
        lastModified: new Date(),
        changeFrequency: path === "" ? "weekly" : "daily",
        priority: path === "" ? 1 : 0.8,
      });
    }
  }

  // Fallback root for the default locale (SEO friendly crawl).
  entries.push({
    url: loc(`/${defaultLocale}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  });

  return entries;
}