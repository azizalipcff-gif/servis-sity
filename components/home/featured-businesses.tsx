import { ArrowRight, ArrowUpRight, Building2, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BusinessCard } from "@/components/business-card";
import { EmptyState } from "@/components/empty-state";
import { RatingStars } from "@/components/rating-stars";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { businessHref } from "@/lib/business/url";
import { localizedName, type Locale } from "@/lib/translations";
import type { BusinessWithCategory } from "@/lib/queries";

export async function FeaturedBusinesses({ businesses, locale }: { businesses: BusinessWithCategory[]; locale: Locale }) {
  const t = await getTranslations("featured");
  const [lead, ...rest] = businesses;
  const renderedRest = rest.slice(0, 6);

  return (
    <section id="businesses" className="container-site scroll-mt-24 py-10 md:py-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 className="mt-1 text-editorial text-2xl sm:text-3xl">{t("title")}</h2>
        </div>
        {businesses.length > 0 && <Link href="/business" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline">{t("viewAll")}<ArrowRight className="size-4 rtl:rotate-180" /></Link>}
      </div>

      {businesses.length === 0 ? (
        <EmptyState icon={<Building2 className="size-7" />} title={t("emptyTitle")} description={t("empty")} action={<Button asChild><Link href="/dashboard">{t("registerCta")}<ArrowUpRight className="size-4 rtl:rotate-180" /></Link></Button>} />
      ) : lead ? <LeadCard business={lead} locale={locale} /> : null}

      {renderedRest.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {renderedRest.map((b) => <BusinessCard key={b.id} business={b} />)}
        </div>
      )}
    </section>
  );
}

async function LeadCard({ business, locale }: { business: BusinessWithCategory; locale: Locale }) {
  const t = await getTranslations("featured");
  const categoryName = localizedName(business.categories, locale);
  const href = businessHref(business);

  return (
    <Link href={href} className="group grid gap-0 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-2">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted lg:aspect-auto lg:min-h-[360px]">
        <SmartImage src={business.cover_url} alt={business.name} fallback={DEFAULT_PLACEHOLDER_IMAGES.cover} className="h-full w-full" imgClassName="object-cover transition-transform duration-700 group-hover:scale-105" />
        <span className="pointer-events-none absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">{t("leadLabel")}<ArrowUpRight className="size-3.5 rtl:rotate-180" /></span>
      </div>
      <div className="flex flex-col justify-center gap-4 bg-foreground p-6 text-background md:p-10">
        <div className="flex flex-wrap items-center gap-3"><span className="text-xs font-semibold uppercase tracking-wider text-background/50">{categoryName}</span>{business.city && <span className="inline-flex items-center gap-1 text-sm text-background/65"><MapPin className="size-3.5" />{business.city}</span>}</div>
        <h3 className="text-3xl font-bold leading-tight md:text-4xl">{business.name}</h3>
        {business.description && <p className="line-clamp-3 max-w-md text-[15px] leading-relaxed text-background/70">{business.description}</p>}
        <div className="mt-2 flex items-center gap-3"><RatingStars rating={business.rating_avg} size="size-4" dark /><span className="text-sm font-semibold">{business.rating_avg > 0 ? business.rating_avg.toFixed(1) : "—"}</span><span className="text-sm text-background/60">{business.reviews_count > 0 ? t("reviews", { count: business.reviews_count }) : t("noReviews")}</span></div>
        <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg border border-background/25 px-4 py-2 text-sm font-semibold transition-colors group-hover:border-background group-hover:bg-background group-hover:text-foreground">{t("viewBusiness")}<ArrowUpRight className="size-4 rtl:rotate-180" /></span>
      </div>
    </Link>
  );
}
