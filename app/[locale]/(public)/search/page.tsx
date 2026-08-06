import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { parseSearchParams } from "@/lib/search/url";
import { getCategories } from "@/lib/queries";
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

  return (
    <main className="pb-16">
      <SearchExplorer
        categories={categories}
        initial={{
          q: initial.q,
          city: initial.city,
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
    </main>
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const initial = parseSearchParams(sp);
  const [t, meta] = await Promise.all([
    getTranslations({ locale, namespace: "search" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);

  const parts = [initial.q || t("title")].filter(Boolean);
  if (initial.city) parts.push(initial.city);
  if (initial.category) parts.push(initial.category);

  const canonical = new URL(`/${locale}/search`, siteUrl());
  const qs = new URLSearchParams();
  if (initial.q) qs.set("q", initial.q);
  if (initial.city) qs.set("city", initial.city);
  if (initial.category) qs.set("category", initial.category);
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