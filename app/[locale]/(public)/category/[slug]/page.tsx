import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { BusinessCard } from "@/components/business-card";
import { EmptyState } from "@/components/empty-state";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { getCategoryBySlug, getBusinessesByCategory } from "@/lib/queries";
import { localizedName, type Locale } from "@/lib/translations";
import { absoluteUrl, localizedLanguages, imageUrl, ogLocale } from "@/lib/seo";
import { businessHref } from "@/lib/business/url";
import { toJsonLd } from "@/lib/security/sanitize";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const name = localizedName(category, locale as Locale);
  const siteName = "Servis Sity";
  const url = absoluteUrl(`/${locale}/category/${slug}`);
  const ogImage = imageUrl(category.image_url) || absoluteUrl("/branding/service-city-logo.png");

  const title = category.seo_title || `${name} — Servis Sity`;
  const description =
    category.seo_description ||
    `${name} au Maroc — trouvez des professionnels, entreprises et services locaux, comparez les offres et contactez facilement les prestataires sur Servis Sity.`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: localizedLanguages(`/category/${slug}`),
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName,
      locale: ogLocale(locale),
      images: [{ url: ogImage, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("category");
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const name = localizedName(category, locale as Locale);
  const businesses = await getBusinessesByCategory(slug);

  const breadcrumb = toJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("home"),
        item: absoluteUrl(`/${locale}`),
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: absoluteUrl(`/${locale}/category/${category.slug}`),
      },
    ],
  });

  const itemListJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: businesses
      .filter((b) => b.slug)
      .map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        url: absoluteUrl(`/${locale}${businessHref(b)}`),
      })),
  });

  return (
    <>
      <BreadcrumbNav items={[{ label: name }]} />
      <div className="container-wide py-12">
        <FadeIn>
          <div className="border-b border-border pb-8">
            <h1 className="text-editorial text-3xl sm:text-4xl md:text-5xl">
              {name}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {t("subtitle", { name })}
            </p>
          </div>
        </FadeIn>

        {businesses.length === 0 ? (
          <FadeIn delay={0.1}>
            <div className="mt-10">
              <EmptyState
                icon={<LayoutGrid className="size-7" />}
                title={t("emptyTitle")}
                description={t("empty")}
              />
            </div>
          </FadeIn>
        ) : (
          <Stagger className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {businesses.map((business) => (
              <StaggerItem key={business.id} className="h-full">
                <BusinessCard business={business} />
              </StaggerItem>
            ))}
          </Stagger>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: breadcrumb }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: itemListJsonLd }}
        />
      </div>
    </>
  );
}
