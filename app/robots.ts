import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW, sitemapUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ROBOTS_DISALLOW,
    },
    sitemap: sitemapUrl(),
  };
}
