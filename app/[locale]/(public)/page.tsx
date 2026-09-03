import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { FeaturedMarketplace } from "@/components/home/featured-marketplace";
import { CatalogPagination } from "@/components/catalog-pagination";
import {
  getPublishedBusinesses,
  getPublishedProducts,
  getPublishedServices,
} from "@/lib/queries";
import { siteUrl, absoluteUrl, localizedLanguages } from "@/lib/seo";
import { SEO_BRAND, SEO_LOGO_PATH } from "@/lib/seo-brand";
import { toJsonLd } from "@/lib/security/sanitize";

export const revalidate = 60;

const ITEMS_PER_TYPE = 8;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getOffset(searchParams: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(searchParams.offset) ? searchParams.offset[0] : searchParams.offset;
  const parsed = Number.parseInt(raw ?? "0", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed / ITEMS_PER_TYPE) * ITEMS_PER_TYPE : 0;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: { absolute: t("title") },
    description: t("description"),
    applicationName: SEO_BRAND,
    alternates: {
      canonical: absoluteUrl(`/${locale}`),
      languages: localizedLanguages(""),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: absoluteUrl(`/${locale}`),
      siteName: SEO_BRAND,
      images: [{ url: absoluteUrl(SEO_LOGO_PATH) }],
    },
  };
}

export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const offset = getOffset(await searchParams);
  const [businesses, products, services] = await Promise.all([
    getPublishedBusinesses({ limit: ITEMS_PER_TYPE, offset }),
    getPublishedProducts({ limit: ITEMS_PER_TYPE, offset }),
    getPublishedServices({ limit: ITEMS_PER_TYPE, offset }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(businesses.total, products.total, services.total) / ITEMS_PER_TYPE),
  );
  const currentPage = Math.min(totalPages, Math.floor(offset / ITEMS_PER_TYPE) + 1);

  const mixedItems = [
    ...services.items.map((item) => ({ type: "service" as const, item })),
    ...products.items.map((item) => ({ type: "product" as const, item })),
    ...businesses.items.map((item) => ({ type: "business" as const, item })),
  ];

  const organizationJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_BRAND,
    url: siteUrl(),
    logo: `${siteUrl()}${SEO_LOGO_PATH}`,
    description:
      "Moroccan marketplace for discovering local businesses, services and products.",
  });

  const websiteJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_BRAND,
    url: siteUrl(),
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(`/${locale}/search`)}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
      />
      <FeaturedMarketplace items={mixedItems} />
      <CatalogPagination
        currentPage={currentPage}
        totalPages={totalPages}
        hrefForPage={(page) => page === 1 ? "/" : `/?offset=${(page - 1) * ITEMS_PER_TYPE}`}
        label="Marketplace pages"
      />
    </>
  );
}
