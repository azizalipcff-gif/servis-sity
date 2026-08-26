import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, RotateCcw, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/empty-state";
import { BusinessCard } from "@/components/business-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BUSINESS_LIMIT_DEFAULT,
  hasActiveBusinessFilters,
  parseBusinessesParams,
  type BusinessSort,
} from "@/lib/business/filters";
import { getCategories, getCategoryBySlug, getPublishedBusinesses } from "@/lib/queries";
import { localizedName, type Locale } from "@/lib/translations";
import { absoluteUrl, localizedLanguages } from "@/lib/seo";
import { toJsonLd } from "@/lib/security/sanitize";
import { businessHref } from "@/lib/business/url";
import { MOROCCAN_CITIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "businessesPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: absoluteUrl(`/${locale}/business`),
      languages: localizedLanguages(`/business`),
    },
    openGraph: {
      title: t("title"),
      description: t("subtitle"),
      url: absoluteUrl(`/${locale}/business`),
      siteName: "Service City",
      images: [{ url: absoluteUrl("/branding/service-city-logo.png") }],
    },
  };
}

const SORT_KEYS: BusinessSort[] = ["newest", "rating", "reviews"];

export default async function BusinessesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("businessesPage");
  const state = parseBusinessesParams(await searchParams);
  const limit = BUSINESS_LIMIT_DEFAULT;

  const categories = await getCategories();

  let categoryId: string | null = null;
  if (state.category) {
    const cat = await getCategoryBySlug(state.category);
    categoryId = cat?.id ?? null;
  }

  const { items, total } = await getPublishedBusinesses({
    query: state.q || undefined,
    categoryId: categoryId ?? undefined,
    city: state.city || undefined,
    verifiedOnly: state.verified || undefined,
    sort: state.sort,
    limit,
    offset: state.offset,
  });

  const breadcrumbJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl(`/${locale}`),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("title"),
        item: absoluteUrl(`/${locale}/business`),
      },
    ],
  });

  const itemListJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items
      .filter((b) => b.slug)
      .map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        url: absoluteUrl(`/${locale}${businessHref(b)}`),
      })),
  });

  const hasFilters = hasActiveBusinessFilters(state);
  const hasMore = state.offset + items.length < total;
  const inputBase =
    "h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="container-site py-8 md:py-12">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="text-editorial text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <form method="get" className="mt-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="businesses-search"
            name="q"
            defaultValue={state.q}
            placeholder={t("searchPlaceholder")}
            className="h-11 ps-9 pe-4 rounded-2xl"
            aria-label={t("searchPlaceholder")}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="submit"
              name="category"
              value=""
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                !state.category
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {t("allCategories")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="submit"
                name="category"
                value={c.slug}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  state.category === c.slug
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {localizedName(c, locale as Locale)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
            <select
              name="city"
              defaultValue={state.city}
              aria-label={t("city")}
              className={cn(
                inputBase,
                "w-auto min-w-36 appearance-none bg-background pe-3",
              )}
            >
              <option value="">{t("allCities")}</option>
              {MOROCCAN_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm shadow-sm">
              <input
                name="verified"
                type="checkbox"
                value="1"
                defaultChecked={state.verified}
                className="size-4 accent-primary"
              />
              <span className="font-medium">{t("verified")}</span>
            </label>
            <Button type="submit" size="sm" className="h-9">
              {t("apply")}
            </Button>
          </div>

          {/* Sort */}
          <div
            className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border p-0.5"
            role="group"
            aria-label={t("sortLabel")}
          >
            {SORT_KEYS.map((sort) => (
              <button
                key={sort}
                type="submit"
                name="sort"
                value={sort}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  state.sort === sort
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`sort.${sort}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Count + results */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("results", { count: total })}
          </p>
          {hasFilters && (
            <Link
              href="/business"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
            >
              <RotateCcw className="size-3.5" />
              {t("clear")}
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<Building2 className="size-7" />}
            title={t("noResults")}
            description={hasFilters ? t("noResultsHint") : t("emptyHint")}
            action={
              hasFilters ? (
                <Button asChild variant="outline">
                  <Link href="/business">{t("clear")}</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              name="offset"
              value={state.offset + limit}
              variant="outline"
              size="lg"
            >
              {t("loadMore")}
            </Button>
          </div>
        )}
      </form>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: itemListJsonLd }}
      />
    </div>
  );
}