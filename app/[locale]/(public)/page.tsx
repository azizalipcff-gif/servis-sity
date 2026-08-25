import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { HomeSearch } from "@/components/home/home-search";
import { MarketplaceTypes } from "@/components/home/marketplace-types";
import { FeaturedBusinesses } from "@/components/home/featured-businesses";
import { FeaturedMarketplace } from "@/components/home/featured-marketplace";
import { TrustBadges } from "@/components/home/trust-badges";
import { PromoBanner } from "@/components/home/promo-banner";
import { TrustSection } from "@/components/home/trust-section";
import {
  getBusinessCount,
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

// The homepage is fully public (categories, cities, featured, counts) and all
// of its data is already cached via `unstable_cache`. Rendering it dynamically
// on every request forced a server round-trip (TTFB) that delayed both LCP and
// TTI. Generating it statically with ISR keeps the HTML on the CDN and lets the
// hero paint immediately; data refreshes every 5 minutes.
export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: { absolute: t("title") },
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
    businesses,
    businessCount,
    cities,
    products,
    services,
    productsCount,
    servicesCount,
  ] = await Promise.all([
    getFeaturedBusinesses(),
    getBusinessCount(),
    getCities(),
    getFeaturedProducts(8),
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
      <HomeSearch
        businessCount={businessCount}
        cityCount={cities.length}
        serviceCount={servicesCount}
        productCount={productsCount}
      >
        <FeaturedMarketplace services={services} products={products} />
        <MarketplaceTypes />
        <FeaturedBusinesses businesses={businesses} locale={locale as Locale} />
        <PromoBanner />
        <TrustSection businessCount={businessCount} cityCount={cities.length} />
        <TrustBadges />
      </HomeSearch>
    </>
  );
}