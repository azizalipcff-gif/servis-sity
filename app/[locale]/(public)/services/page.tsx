import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RotateCcw, Search, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/empty-state";
import { ServiceCard } from "@/components/services/service-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  hasActiveServiceFilters,
  parseServicesParams,
  SERVICE_LIMIT_DEFAULT,
  type ServiceSort,
} from "@/lib/services/filters";
import { getCategories, getCategoryBySlug, getPublishedServices } from "@/lib/queries";
import { localizedName, type Locale } from "@/lib/translations";
import { absoluteUrl, localizedLanguages } from "@/lib/seo";
import { toJsonLd } from "@/lib/security/sanitize";
import { MOROCCAN_CITIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "servicesPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: absoluteUrl(`/${locale}/services`),
      languages: localizedLanguages(`/services`),
    },
    openGraph: {
      title: t("title"),
      description: t("subtitle"),
      url: absoluteUrl(`/${locale}/services`),
      siteName: "Service City",
      images: [{ url: absoluteUrl("/branding/service-city-logo.png") }],
    },
  };
}

const SORT_KEYS: ServiceSort[] = ["newest", "price_asc", "price_desc"];

export default async function ServicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("servicesPage");
  const state = parseServicesParams(await searchParams);
  const limit = SERVICE_LIMIT_DEFAULT;

  const categories = await getCategories();

  let categoryId: string | null = null;
  if (state.category) {
    const cat = await getCategoryBySlug(state.category);
    categoryId = cat?.id ?? null;
  }

  const { items, total } = await getPublishedServices({
    query: state.q || undefined,
    categoryId: categoryId ?? undefined,
    city: state.city || undefined,
    minPrice: state.minPrice ?? undefined,
    maxPrice: state.maxPrice ?? undefined,
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
        item: absoluteUrl(`/${locale}/services`),
      },
    ],
  });

  const itemListJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items
      .filter((s) => s.id)
      .map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.name,
        url: absoluteUrl(`/${locale}/service/${s.id}`),
      })),
  });

  const hasFilters = hasActiveServiceFilters(state);
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
            id="services-search"
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
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="services-min"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("minPrice")}
              </label>
              <input
                id="services-min"
                name="minPrice"
                type="number"
                min={0}
                defaultValue={state.minPrice ?? ""}
                placeholder={t("minPrice")}
                className={cn(inputBase, "w-24")}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="services-max"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("maxPrice")}
              </label>
              <input
                id="services-max"
                name="maxPrice"
                type="number"
                min={0}
                defaultValue={state.maxPrice ?? ""}
                placeholder={t("maxPrice")}
                className={cn(inputBase, "w-24")}
              />
            </div>
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
              href="/services"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
            >
              <RotateCcw className="size-3.5" />
              {t("clear")}
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<Wrench className="size-7" />}
            title={t("noResults")}
            description={hasFilters ? t("noResultsHint") : t("emptyHint")}
            action={
              hasFilters ? (
                <Button asChild variant="outline">
                  <Link href="/services">{t("clear")}</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((s) => (
              <ServiceCard key={s.id} service={s} />
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