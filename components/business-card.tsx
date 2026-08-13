"use client";

import { useLocale } from "next-intl";
import { ResultCardShell } from "@/components/search/result-card-shell";
import { businessHref } from "@/lib/business/url";
import { localizedName, type Locale } from "@/lib/translations";
import type { BusinessWithCategory } from "@/lib/queries";

/**
 * Business card = the SAME marketplace card language as services, products
 * and mixed search results (ResultCardShell), fed business-only data.
 * Business cards have no price, so the price row is hidden.
 * `premium` surfaces the paid "Premium" pill on the cover.
 */
export function BusinessCard({
  business,
}: {
  business: BusinessWithCategory;
}) {
  const locale = useLocale() as Locale;
  const category = localizedName(business.categories, locale);

  return (
    <ResultCardShell
      data={{
        kind: "business",
        id: business.id,
        href: businessHref(business),
        name: business.name,
        imageSrc: business.cover_url ?? business.logo_url ?? null,
        verified: business.verified,
        categoryLabel: null, // resolved by the caller-provided `category`
        rating: business.rating_avg ?? 0,
        reviewsCount: business.reviews_count ?? 0,
        city: business.city ?? null,
        sellerName: null,
        durationMinutes: null,
        priceValue: null,
        priceMode: "request",
        compareAtPrice: null,
        discountPct: null,
        outOfStock: false,
      }}
      category={category}
      premium={business.plan === "premium"}
      showPrice={false}
    />
  );
}