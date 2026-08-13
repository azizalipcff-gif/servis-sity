import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  Store,
  Wrench,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { FadeIn } from "@/components/motion";
import { Gallery } from "@/components/business/gallery";
import { ServiceDetailHero } from "@/components/services/service-detail-hero";
import { ServiceCard } from "@/components/services/service-card";
import { RatingStars } from "@/components/rating-stars";
import { SmartImage } from "@/components/smart-image";
import { Button } from "@/components/ui/button";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { toJsonLd } from "@/lib/security/sanitize";
import { absoluteUrl, imageUrl, localizedLanguages } from "@/lib/seo";
import {
  getServiceById,
  getServicesForBusinessRow,
  getSimilarServices,
  type ServiceBusiness,
} from "@/lib/queries";
import { formatPrice, localizedName, type Locale } from "@/lib/translations";
import { businessHref } from "@/lib/business/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const service = await getServiceById(id);
  if (!service) return { title: "Not found", description: "Service not found" };

  const t = await getTranslations({ locale, namespace: "meta" });
  const title = `${service.name} · Service City`;
  const description =
    service.description?.slice(0, 155) ||
    service.business?.name ||
    t("title");
  const url = absoluteUrl(`/${locale}/service/${id}`);
  const images = [service.photo_url, ...service.gallery].filter(
    (url): url is string => Boolean(url),
  );
  const ogImage =
    imageUrl(images[0]) || absoluteUrl("/branding/service-city-logo.png");

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: localizedLanguages(`/service/${id}`),
    },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Service City",
      images: [{ url: ogImage, width: 1200, height: 630, alt: service.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ServicePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("service");
  const tb = await getTranslations("business");
  const service = await getServiceById(id);
  if (!service) notFound();

  const biz = service.business;
  const [businessServices, similar] = await Promise.all([
    biz ? getServicesForBusinessRow(biz.id, service.id) : Promise.resolve([]),
    getSimilarServices(
      biz?.category_id ?? null,
      service.id,
      biz?.id ?? "",
    ),
  ]);

  const categoryName = service.categories
    ? localizedName(service.categories, locale as Locale)
    : null;

  const serviceJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    image: imagesOf(service).map((url) => imageUrl(url)),
    description: service.description ?? undefined,
    provider: biz ? { "@type": "LocalBusiness", name: biz.name } : undefined,
    ...(service.price != null
      ? {
          offers: {
            "@type": "Offer",
            price: service.price,
            priceCurrency: "MAD",
          },
        }
      : {}),
  });

  return (
    <div className="pb-24 lg:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serviceJsonLd }}
      />

      {/* Cinematic hero — first visual element below the navbar */}
      <ServiceDetailHero service={service} />

      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="container-site mt-5 flex items-center gap-2 text-[13px] text-muted-foreground"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Home className="size-3.5" />
          <span>{tb("home")}</span>
        </Link>
        <ChevronRight
          className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180"
          aria-hidden
        />
        {service.categories ? (
          <Link
            href={`/services?category=${service.categories.slug}`}
            className="max-w-40 truncate transition-colors hover:text-foreground"
          >
            {categoryName}
          </Link>
        ) : null}
        <ChevronRight
          className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180"
          aria-hidden
        />
        <span className="truncate font-medium text-foreground">
          {service.name}
        </span>
      </nav>

      <div className="container-site mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        {/* Main column */}
        <div className="min-w-0 space-y-10">
          <FadeIn>
            {imagesOf(service).length ? (
              <Gallery
                images={imagesOf(service).map((url) => ({ id: url, url }))}
                title={service.name}
              />
            ) : (
              <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl bg-muted">
                <Wrench className="size-16 text-primary/40" />
              </div>
            )}
          </FadeIn>

          {service.description && (
            <FadeIn>
              <section>
                <h2 className="text-lg font-semibold">{t("description")}</h2>
                <p className="mt-3 max-w-2xl whitespace-pre-line leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </section>
            </FadeIn>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <FadeIn>
            <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {service.price != null ? (
                  <p className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                    {formatPrice(service.price, locale as Locale)}
                  </p>
                ) : (
                  <p className="text-xl font-semibold">{t("priceOnRequest")}</p>
                )}
                {service.duration_minutes ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-muted-foreground">
                    <Clock className="size-3.5 text-primary" />
                    {service.duration_minutes} {tb("minutes")}
                  </span>
                ) : null}
              </div>

              {service.featured && (
                <p className="mt-3 text-sm font-medium text-primary">
                  {t("featured")}
                </p>
              )}
            </aside>
          </FadeIn>

          {biz && (
            <FadeIn>
              <ProviderCard business={biz} t={t} tb={tb} />
            </FadeIn>
          )}
        </div>
      </div>

      {/* More from this provider */}
      {businessServices.length > 0 && (
        <section className="container-site mt-14">
          <div className="mb-5 border-b border-border pb-4">
            <h2 className="text-editorial text-2xl sm:text-3xl">
              {t("moreFromBusiness")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {businessServices.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                seller={
                  biz
                    ? {
                        name: biz.name,
                        slug: biz.slug,
                        logo_url: biz.logo_url,
                        verified: biz.verified,
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Similar services */}
      {similar.length > 0 && (
        <section className="container-site mt-14">
          <div className="mb-5 border-b border-border pb-4">
            <h2 className="text-editorial text-2xl sm:text-3xl">
              {t("similarServices")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {similar.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </section>
      )}

      {/* Browse more */}
      <div className="container-site mt-14 flex flex-col items-center gap-3 border-t border-border pt-8 text-center">
        <p className="eyebrow">{t("browseAllEyebrow")}</p>
        <h2 className="text-editorial text-2xl">{t("browseAllTitle")}</h2>
        <Button asChild className="mt-2">
          <Link href="/services">
            {t("browseAllCta")}
            <ArrowUpRight className="size-4 rtl:rotate-180" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function imagesOf(service: {
  photo_url: string | null;
  gallery: string[];
}): string[] {
  return [service.photo_url, ...service.gallery].filter(
    (url): url is string => Boolean(url),
  );
}

function ProviderCard({
  business,
  t,
  tb,
}: {
  business: ServiceBusiness;
  t: Awaited<ReturnType<typeof getTranslations>>;
  tb: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const href = businessHref(business);
  return (
    <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("seller")}
      </h2>
      <Link href={href} className="group mt-3 flex items-center gap-3">
        {business.logo_url ? (
          <span className="size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
            <SmartImage
              src={business.logo_url}
              alt={business.name ?? ""}
              fallback={DEFAULT_PLACEHOLDER_IMAGES.logo}
              className="h-full w-full"
              imgClassName="object-cover"
            />
          </span>
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <Store className="size-6" />
          </span>
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="line-clamp-1 font-semibold group-hover:underline">
              {business.name}
            </span>
            {business.verified && (
              <span title={tb("verified")}>
                <BadgeCheck className="size-4 shrink-0 fill-primary/15 text-primary" />
              </span>
            )}
          </span>
          {business.city && (
            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {business.city}
            </span>
          )}
        </span>
      </Link>

      {business.rating_avg > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <RatingStars rating={business.rating_avg} size="size-3.5" />
          <span className="text-sm font-semibold">
            {business.rating_avg.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            {business.reviews_count > 0
              ? tb("reviews", { count: business.reviews_count })
              : tb("noReviews")}
          </span>
        </div>
      )}

      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href={href}>
          {t("visitBusiness")}
          <ArrowUpRight className="size-4 rtl:rotate-180" />
        </Link>
      </Button>
    </aside>
  );
}