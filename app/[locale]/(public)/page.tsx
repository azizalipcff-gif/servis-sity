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
  getPublishedCityCount,
  getFeaturedBusinesses,
  getFeaturedProducts,
  getPopularServices,
  getPublishedProductsCount,
  getPublishedServicesCount,
} from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { siteUrl, absoluteUrl, localizedLanguages } from "@/lib/seo";
import { toJsonLd } from "@/lib/security/sanitize";

// Keep the public homepage fast while ensuring marketplace counts and rails
// refresh frequently. Admin mutations also invalidate the corresponding tags.
export const revalidate = 60;

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
    cityCount,
    products,
    services,
    productsCount,
    servicesCount,
  ] = await Promise.all([
    getFeaturedBusinesses(),
    getBusinessCount(),
    getPublishedCityCount(),
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
      "Arabic-first marketplace foundation for discovering local businesses, services and products.",
  });

  const websiteJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Service City",
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
      <HomeSearch
        businessCount={businessCount}
        cityCount={cityCount}
        serviceCount={servicesCount}
        productCount={productsCount}
      >
        <FeaturedMarketplace services={services} products={products} />
        <MarketplaceTypes />
        <FeaturedBusinesses businesses={businesses} locale={locale as Locale} />
        <PromoBanner />
        <TrustSection businessCount={businessCount} cityCount={cityCount} />
        <TrustBadges />
      </HomeSearch>
    </>
  );
}
