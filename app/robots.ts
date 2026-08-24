import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // The app runs with localePrefix "always" (/en, /fr, /ar), so private
        // areas are matched with /*/ wildcards — a bare "/admin" pattern would
        // never match "/en/admin" and would leave those pages indexable.
        "/*/mvkbazizalimvkbadmen",
        "/*/dashboard",
        "/*/login",
        "/*/register",
        "/*/profile",
        "/*/messenger",
        "/*/checkout",
        "/api/",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}