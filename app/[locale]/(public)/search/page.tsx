import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { parseSearchParams } from "@/lib/search/url";
import { getCategories } from "@/lib/queries";
import {
  getSearchIndex,
  resolveCanonicalCity,
} from "@/lib/search/index";
import { siteUrl } from "@/lib/seo";
import { SearchExplorer } from "@/components/search/search-explorer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [initial, categories] = await Promise.all([
    parseSearchParams(await searchParams),
    getCategories(),
  ]);

  // Single canonical city normalization point — "Fès" → "Fes" (stored value).
  const resolvedCity = await resolveCanonicalCity(initial.city);
  const canonicalCity = resolvedCity?.name ?? initial.city;

  const needsIndex =
    !initial.q &&
    !initial.city &&
    initial.type === "all" &&
    !initial.category &&
    initial.minRating === 0 &&
    initial.minPrice == null &&
    initial.maxPrice == null &&
    !initial.verifiedOnly &&
    !initial.premiumOnly &&
    !initial.openNowOnly &&
    initial.sort === "recommended";
  const index = needsIndex ? await getSearchIndex(null) : null;

  return (
    <div className="pb-16">
      <SearchExplorer
        categories={categories}
        index={index}
        initial={{
          q: initial.q,
          type: initial.type,
          city: canonicalCity,
          category: initial.category,
          minRating: initial.minRating,
          minPrice: initial.minPrice,
          maxPrice: initial.maxPrice,
          verifiedOnly: initial.verifiedOnly,
          premiumOnly: initial.premiumOnly,
          openNowOnly: initial.openNowOnly,
          sort: initial.sort,
        }}
      />
    </div>
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const [t, meta] = await Promise.all([
    getTranslations({ locale, namespace: "search" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);

  const rawCity = typeof sp.city === "string" ? sp.city : undefined;
  const rawCategory = typeof sp.category === "string" ? sp.category : "";
  const resolvedCity = await resolveCanonicalCity(rawCity);
  const city = resolvedCity?.name ?? rawCity ?? "";

  const parts = [initialQ(sp) || t("title")].filter(Boolean);
  if (city) parts.push(city);
  if (rawCategory) parts.push(rawCategory);

  const canonical = new URL(`/${locale}/search`, siteUrl());
  const qs = new URLSearchParams();
  if (initialQ(sp)) qs.set("q", initialQ(sp));
  if (city) qs.set("city", city);
  if (rawCategory) qs.set("category", rawCategory);
  const qstring = qs.toString();
  if (qstring) canonical.search = qstring;

  const hasFilters = qstring !== "";

  return {
    title: `${parts.join(" · ")} — ${meta("title")}`,
    description: t("subtitle"),
    alternates: { canonical: canonical.toString() },
    robots: hasFilters ? { index: false, follow: true } : undefined,
  };
}

function initialQ(sp: Record<string, string | string[] | undefined>): string {
  const v = sp.q;
  return typeof v === "string" && v.length > 0 ? v.trim() : "";
}