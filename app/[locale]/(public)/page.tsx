import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { MarketplaceTypes } from "@/components/home/marketplace-types";
import { CategoryStrip } from "@/components/home/category-strip";
import { FeaturedBusinesses } from "@/components/home/featured-businesses";
import { FeaturedMarketplace } from "@/components/home/featured-marketplace";
import { TrustBadges } from "@/components/home/trust-badges";
import { PopularCategories } from "@/components/home/popular-categories";
import { PromoBanner } from "@/components/home/promo-banner";
import { TrustSection } from "@/components/home/trust-section";
import {
  getBusinessCount,
  getCategories,
  getCategoryCounts,
  getCities,
  getFeaturedBusinesses,
  getFeaturedProducts,
  getPopularServices,
  getPublishedProductsCount,
  getPublishedServicesCount,
} from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { siteUrl, absoluteUrl, localizedLanguages } from "@/lib/seo";
import { toJsonLd } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: absoluteUrl(`/${locale}`),
      languages: localizedLanguages(""),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: absoluteUrl(`/${locale}`),
      siteName: "Service City",
      images: [{ url: absoluteUrl("/branding/service-city-logo.png") }],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [
    categories,
    businesses,
    businessCount,
    cities,
    products,
    counts,
    services,
    productsCount,
    servicesCount,
  ] = await Promise.all([
    getCategories(),
    getFeaturedBusinesses(),
    getBusinessCount(),
    getCities(),
    getFeaturedProducts(8),
    getCategoryCounts(),
    getPopularServices(8),
    getPublishedProductsCount(),
    getPublishedServicesCount(),
  ]);

  const organizationJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Service City",
    url: siteUrl(),
    logo: `${siteUrl()}/branding/service-city-logo.png`,
    description:
      "The Moroccan platform connecting customers with local businesses and artisans: electrician, plumber, restaurant, barber, doctor and more.",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
      />
      <Hero
        businessCount={businessCount}
        cityCount={cities.length}
        serviceCount={servicesCount}
        productCount={productsCount}
      />
      <FeaturedMarketplace services={services} products={products} />
      <CategoryStrip
        categories={categories}
        counts={counts}
        locale={locale as Locale}
      />
      <TrustBadges />
      <MarketplaceTypes />
      <FeaturedBusinesses businesses={businesses} locale={locale as Locale} />
      <PopularCategories categories={categories} locale={locale as Locale} />
      <PromoBanner />
      <TrustSection businessCount={businessCount} cityCount={cities.length} />
    </>
  );
}